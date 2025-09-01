/**
 * Organizer builder for handling game scope and filtering logic
 * Supports: All Games, Last X Games, Game Range, Home/Away
 */

const buildOrganizerClause = (organizer, measure, paramIndex = 1) => {
  if (!organizer || !organizer.type) {
    // Default to all games if no organizer specified
    return {
      organizerClause: '',
      organizerParams: [],
      additionalJoins: '',
      additionalWhere: '',
      paramCount: 0
    };
  }

  let organizerClause = '';
  let organizerParams = [];
  let additionalJoins = '';
  let additionalWhere = '';
  let paramCount = 0;

  const { type, value, from, to, gameType } = organizer;

  switch (type) {
    case 'all_games':
      // No additional filtering needed - this is the default behavior
      break;

    case 'last_games':
      if (!value || value <= 0) {
        throw new Error('Last games organizer requires a positive value');
      }

      if (measure === 'Players') {
        // For players, we need to get the last X games for each player
        // We'll use a window function to rank games by date for each player
        additionalJoins = `
          JOIN (
            SELECT 
              pgs.player_id,
              pgs.game_id,
              ROW_NUMBER() OVER (
                PARTITION BY pgs.player_id 
                ORDER BY g.game_date DESC, g.id DESC
              ) as game_rank
            FROM player_game_stats pgs
            JOIN games g ON pgs.game_id = g.id
            WHERE g.game_type = 'regular'
          ) ranked_games ON pgs.player_id = ranked_games.player_id 
                         AND pgs.game_id = ranked_games.game_id
        `;
        additionalWhere = `AND ranked_games.game_rank <= $${paramIndex}`;
        organizerParams.push(value);
        paramCount = 1;
      } else {
        // For teams, get last X games for each team
        additionalJoins = `
          JOIN (
            SELECT 
              team_id,
              game_id,
              ROW_NUMBER() OVER (
                PARTITION BY team_id 
                ORDER BY g.game_date DESC, g.id DESC
              ) as game_rank
            FROM (
              SELECT home_team_id as team_id, id as game_id FROM games WHERE game_type = 'regular'
              UNION ALL
              SELECT away_team_id as team_id, id as game_id FROM games WHERE game_type = 'regular'
            ) team_games
            JOIN games g ON team_games.game_id = g.id
          ) ranked_team_games ON (
            (tgs.team_id = ranked_team_games.team_id AND tgs.game_id = ranked_team_games.game_id)
          )
        `;
        additionalWhere = `AND ranked_team_games.game_rank <= $${paramIndex}`;
        organizerParams.push(value);
        paramCount = 1;
      }
      break;

    case 'game_range':
      if (!from || !to || from <= 0 || to <= 0 || from > to) {
        throw new Error('Game range organizer requires valid from and to values (from <= to)');
      }

      if (measure === 'Players') {
        // For players, filter by game number range for each player
        additionalJoins = `
          JOIN (
            SELECT 
              pgs.player_id,
              pgs.game_id,
              ROW_NUMBER() OVER (
                PARTITION BY pgs.player_id 
                ORDER BY g.game_date ASC, g.id ASC
              ) as game_number
            FROM player_game_stats pgs
            JOIN games g ON pgs.game_id = g.id
            WHERE g.game_type = 'regular'
          ) numbered_games ON pgs.player_id = numbered_games.player_id 
                            AND pgs.game_id = numbered_games.game_id
        `;
        additionalWhere = `AND numbered_games.game_number BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        organizerParams.push(from, to);
        paramCount = 2;
      } else {
        // For teams, filter by game number range for each team
        additionalJoins = `
          JOIN (
            SELECT 
              team_id,
              game_id,
              ROW_NUMBER() OVER (
                PARTITION BY team_id 
                ORDER BY g.game_date ASC, g.id ASC
              ) as game_number
            FROM (
              SELECT home_team_id as team_id, id as game_id FROM games WHERE game_type = 'regular'
              UNION ALL
              SELECT away_team_id as team_id, id as game_id FROM games WHERE game_type = 'regular'
            ) team_games
            JOIN games g ON team_games.game_id = g.id
          ) numbered_team_games ON (
            (tgs.team_id = numbered_team_games.team_id AND tgs.game_id = numbered_team_games.game_id)
          )
        `;
        additionalWhere = `AND numbered_team_games.game_number BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
        organizerParams.push(from, to);
        paramCount = 2;
      }
      break;

    case 'home_away':
      if (!gameType || !['home', 'away'].includes(gameType)) {
        throw new Error('Home/Away organizer requires gameType to be either "home" or "away"');
      }

      if (measure === 'Players') {
        // Filter by whether the player's team was home or away
        if (gameType === 'home') {
          additionalWhere = `AND pgs.team_id = g.home_team_id`;
        } else {
          additionalWhere = `AND pgs.team_id = g.away_team_id`;
        }
      } else {
        // Filter by whether the team was home or away
        if (gameType === 'home') {
          additionalWhere = `AND tgs.team_id = g.home_team_id`;
        } else {
          additionalWhere = `AND tgs.team_id = g.away_team_id`;
        }
      }
      break;

    default:
      throw new Error(`Unknown organizer type: ${type}`);
  }

  return {
    organizerClause,
    organizerParams,
    additionalJoins,
    additionalWhere,
    paramCount
  };
};

const validateOrganizer = (organizer) => {
  const errors = [];

  if (!organizer) {
    errors.push('Organizer is required');
    return errors;
  }

  if (!organizer.type) {
    errors.push('Organizer type is required');
    return errors;
  }

  const validTypes = ['all_games', 'last_games', 'game_range', 'home_away'];
  if (!validTypes.includes(organizer.type)) {
    errors.push(`Invalid organizer type. Must be one of: ${validTypes.join(', ')}`);
    return errors;
  }

  switch (organizer.type) {
    case 'all_games':
      // No additional validation needed
      break;

    case 'last_games':
      if (!organizer.value || typeof organizer.value !== 'number' || organizer.value <= 0) {
        errors.push('Last games organizer requires a positive number value');
      }
      if (organizer.value > 82) {
        errors.push('Last games value cannot exceed 82 (max games in NBA season)');
      }
      break;

    case 'game_range':
      if (!organizer.from || typeof organizer.from !== 'number' || organizer.from <= 0) {
        errors.push('Game range organizer requires a positive "from" value');
      }
      if (!organizer.to || typeof organizer.to !== 'number' || organizer.to <= 0) {
        errors.push('Game range organizer requires a positive "to" value');
      }
      if (organizer.from && organizer.to && organizer.from > organizer.to) {
        errors.push('Game range "from" value must be less than or equal to "to" value');
      }
      if (organizer.from > 82 || organizer.to > 82) {
        errors.push('Game range values cannot exceed 82 (max games in NBA season)');
      }
      break;

    case 'home_away':
      if (!organizer.gameType || !['home', 'away'].includes(organizer.gameType)) {
        errors.push('Home/Away organizer requires gameType to be either "home" or "away"');
      }
      break;
  }

  return errors;
};

const getOrganizerDescription = (organizer) => {
  if (!organizer || !organizer.type) {
    return 'All Games (Default)';
  }

  switch (organizer.type) {
    case 'all_games':
      return 'All Games';
    
    case 'last_games':
      return `Last ${organizer.value} Games`;
    
    case 'game_range':
      return `Games ${organizer.from} to ${organizer.to}`;
    
    case 'home_away':
      return `${organizer.gameType.charAt(0).toUpperCase() + organizer.gameType.slice(1)} Games`;
    
    default:
      return 'Unknown Organizer';
  }
};

const canCombineOrganizers = (organizers) => {
  // Check if multiple organizers can be combined
  // Home/Away can be combined with any other organizer
  // But Last Games and Game Range cannot be combined together
  
  const types = organizers.map(org => org.type);
  const hasLastGames = types.includes('last_games');
  const hasGameRange = types.includes('game_range');
  
  if (hasLastGames && hasGameRange) {
    return {
      valid: false,
      message: 'Cannot combine "Last Games" and "Game Range" organizers'
    };
  }
  
  return { valid: true, message: '' };
};

const buildCombinedOrganizerClause = (organizers, measure, paramIndex = 1) => {
  if (!organizers || organizers.length === 0) {
    return buildOrganizerClause(null, measure, paramIndex);
  }

  // Validate combination
  const combinationValidation = canCombineOrganizers(organizers);
  if (!combinationValidation.valid) {
    throw new Error(combinationValidation.message);
  }

  let combinedClause = '';
  let combinedParams = [];
  let combinedJoins = '';
  let combinedWhere = '';
  let totalParamCount = 0;

  // Process each organizer and combine them
  for (const organizer of organizers) {
    const result = buildOrganizerClause(organizer, measure, paramIndex + totalParamCount);
    
    if (result.additionalJoins) {
      combinedJoins += result.additionalJoins;
    }
    
    if (result.additionalWhere) {
      combinedWhere += result.additionalWhere;
    }
    
    combinedParams.push(...result.organizerParams);
    totalParamCount += result.paramCount;
  }

  return {
    organizerClause: combinedClause,
    organizerParams: combinedParams,
    additionalJoins: combinedJoins,
    additionalWhere: combinedWhere,
    paramCount: totalParamCount
  };
};

module.exports = {
  buildOrganizerClause,
  buildCombinedOrganizerClause,
  validateOrganizer,
  getOrganizerDescription,
  canCombineOrganizers
};