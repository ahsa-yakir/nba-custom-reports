/**
 * Enhanced organizer builder for handling game scope with subquery approach
 * Now generates subqueries to properly scope games before aggregation
 */

const buildOrganizerSubquery = (organizer, measure) => {
  if (!organizer || organizer.type === 'all_games') {
    // For all games, just return regular season games
    return {
      subquery: `
        SELECT 
          ${measure === 'Players' ? 'pgs.player_id' : 'tgs.team_id'} as entity_id,
          ${measure === 'Players' ? 'pgs.game_id' : 'tgs.game_id'} as game_id
        FROM ${measure === 'Players' ? 'player_game_stats pgs' : 'team_game_stats tgs'}
        JOIN games g ON ${measure === 'Players' ? 'pgs' : 'tgs'}.game_id = g.id
        WHERE g.game_type = 'regular'
      `,
      description: 'All Games'
    };
  }

  const { type, value, from, to, gameType } = organizer;

  switch (type) {
    case 'last_games':
      if (!value || value <= 0) {
        throw new Error('Last games organizer requires a positive value');
      }

      return {
        subquery: `
          SELECT 
            ${measure === 'Players' ? 'pgs.player_id' : 'team_entity_games.team_id'} as entity_id,
            ${measure === 'Players' ? 'pgs.game_id' : 'team_entity_games.game_id'} as game_id
          FROM (
            ${measure === 'Players' 
              ? `
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
              `
              : `
                SELECT 
                  team_id,
                  game_id,
                  ROW_NUMBER() OVER (
                    PARTITION BY team_id 
                    ORDER BY g.game_date DESC, g.id DESC
                  ) as game_rank
                FROM (
                  SELECT tgs.team_id, tgs.game_id
                  FROM team_game_stats tgs
                  JOIN games g ON tgs.game_id = g.id
                  WHERE g.game_type = 'regular'
                ) team_games
                JOIN games g ON team_games.game_id = g.id
              `
            }
          ) ${measure === 'Players' ? 'pgs' : 'team_entity_games'}
          WHERE game_rank <= ${value}
        `,
        description: `Last ${value} Games`
      };

    case 'game_range':
      if (!from || !to || from <= 0 || to <= 0 || from > to) {
        throw new Error('Game range organizer requires valid from and to values (from <= to)');
      }

      return {
        subquery: `
          SELECT 
            ${measure === 'Players' ? 'pgs.player_id' : 'team_entity_games.team_id'} as entity_id,
            ${measure === 'Players' ? 'pgs.game_id' : 'team_entity_games.game_id'} as game_id
          FROM (
            ${measure === 'Players'
              ? `
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
              `
              : `
                SELECT 
                  team_id,
                  game_id,
                  ROW_NUMBER() OVER (
                    PARTITION BY team_id 
                    ORDER BY g.game_date ASC, g.id ASC
                  ) as game_number
                FROM (
                  SELECT tgs.team_id, tgs.game_id
                  FROM team_game_stats tgs
                  JOIN games g ON tgs.game_id = g.id
                  WHERE g.game_type = 'regular'
                ) team_games
                JOIN games g ON team_games.game_id = g.id
              `
            }
          ) ${measure === 'Players' ? 'pgs' : 'team_entity_games'}
          WHERE game_number BETWEEN ${from} AND ${to}
        `,
        description: `Games ${from} to ${to}`
      };

    case 'home_away':
      if (!gameType || !['home', 'away'].includes(gameType)) {
        throw new Error('Home/Away organizer requires gameType to be either "home" or "away"');
      }

      const homeAwayCondition = measure === 'Players'
        ? (gameType === 'home' ? 'pgs.team_id = g.home_team_id' : 'pgs.team_id = g.away_team_id')
        : (gameType === 'home' ? 'tgs.team_id = g.home_team_id' : 'tgs.team_id = g.away_team_id');

      return {
        subquery: `
          SELECT 
            ${measure === 'Players' ? 'pgs.player_id' : 'tgs.team_id'} as entity_id,
            ${measure === 'Players' ? 'pgs.game_id' : 'tgs.game_id'} as game_id
          FROM ${measure === 'Players' ? 'player_game_stats pgs' : 'team_game_stats tgs'}
          JOIN games g ON ${measure === 'Players' ? 'pgs' : 'tgs'}.game_id = g.id
          WHERE g.game_type = 'regular' AND ${homeAwayCondition}
        `,
        description: `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Games`
      };

    default:
      throw new Error(`Unknown organizer type: ${type}`);
  }
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

module.exports = {
  buildOrganizerSubquery,
  validateOrganizer,
  getOrganizerDescription
};