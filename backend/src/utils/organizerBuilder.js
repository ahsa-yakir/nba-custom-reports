/**
 * Enhanced organizer builder with season-position based logic and date organizers
 * Now supports: all_games, last_games (fixed), game_range, home_away, last_period, date_range
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

  const { type, value, from, to, gameType, period, fromDate, toDate } = organizer;

  switch (type) {
    case 'last_games':
      // FIXED: Per-player/team last games instead of season position
      if (!value || value <= 0) {
        throw new Error('Last games organizer requires a positive value');
      }

      return {
        subquery: `
          WITH ranked_games AS (
            SELECT 
              ${measure === 'Players' ? 'pgs.player_id' : 'tgs.team_id'} as entity_id,
              ${measure === 'Players' ? 'pgs.game_id' : 'tgs.game_id'} as game_id,
              ROW_NUMBER() OVER (
                PARTITION BY ${measure === 'Players' ? 'pgs.player_id' : 'tgs.team_id'}
                ORDER BY g.game_date DESC
              ) as game_rank
            FROM ${measure === 'Players' ? 'player_game_stats pgs' : 'team_game_stats tgs'}
            JOIN games g ON ${measure === 'Players' ? 'pgs' : 'tgs'}.game_id = g.id
            WHERE g.game_type = 'regular'
          )
          SELECT entity_id, game_id
          FROM ranked_games 
          WHERE game_rank <= ${value}
        `,
        description: `Last ${value} Games (Per ${measure.slice(0, -1)})`
      };

    case 'game_range':
      // Keep this as-is since it's based on season position which makes sense for ranges
      if (!from || !to || from <= 0 || to <= 0 || from > to) {
        throw new Error('Game range organizer requires valid from and to values (from <= to)');
      }

      return {
        subquery: `
          SELECT 
            ${measure === 'Players' ? 'pgs.player_id' : 'tgs.team_id'} as entity_id,
            ${measure === 'Players' ? 'pgs.game_id' : 'tgs.game_id'} as game_id
          FROM ${measure === 'Players' ? 'player_game_stats pgs' : 'team_game_stats tgs'}
          JOIN games g ON ${measure === 'Players' ? 'pgs' : 'tgs'}.game_id = g.id
          WHERE g.game_type = 'regular'
            AND (
              (${measure === 'Players' ? 'pgs.team_id = g.home_team_id' : 'tgs.team_id = g.home_team_id'} 
               AND g.home_team_game_number BETWEEN ${from} AND ${to})
              OR
              (${measure === 'Players' ? 'pgs.team_id = g.away_team_id' : 'tgs.team_id = g.away_team_id'}
               AND g.away_team_game_number BETWEEN ${from} AND ${to})
            )
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

    case 'last_period':
      // Keep time-based organizers as-is since they don't rely on game counters
      if (!period || !['days', 'weeks', 'months'].includes(period) || !value || value <= 0) {
        throw new Error('Last period organizer requires valid period (days/weeks/months) and positive value');
      }

      let intervalClause;
      let periodLabel;
      
      switch (period) {
        case 'days':
          intervalClause = `INTERVAL '${value} days'`;
          periodLabel = value === 1 ? 'Day' : 'Days';
          break;
        case 'weeks':
          intervalClause = `INTERVAL '${value} weeks'`;
          periodLabel = value === 1 ? 'Week' : 'Weeks';
          break;
        case 'months':
          intervalClause = `INTERVAL '${value} months'`;
          periodLabel = value === 1 ? 'Month' : 'Months';
          break;
      }

      return {
        subquery: `
          WITH latest_game_date AS (
            SELECT MAX(game_date) as max_date
            FROM games 
            WHERE game_type = 'regular'
          )
          SELECT 
            ${measure === 'Players' ? 'pgs.player_id' : 'tgs.team_id'} as entity_id,
            ${measure === 'Players' ? 'pgs.game_id' : 'tgs.game_id'} as game_id
          FROM ${measure === 'Players' ? 'player_game_stats pgs' : 'team_game_stats tgs'}
          JOIN games g ON ${measure === 'Players' ? 'pgs' : 'tgs'}.game_id = g.id
          CROSS JOIN latest_game_date lgd
          WHERE g.game_type = 'regular'
            AND g.game_date > (lgd.max_date - ${intervalClause})
            AND g.game_date <= lgd.max_date
        `,
        description: `Last ${value} ${periodLabel}`
      };

    case 'date_range':
      // Keep date-based organizers as-is
      if (!fromDate || !toDate) {
        throw new Error('Date range organizer requires both fromDate and toDate');
      }

      // Validate date format (basic check)
      const fromDateObj = new Date(fromDate);
      const toDateObj = new Date(toDate);
      
      if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
        throw new Error('Invalid date format. Use YYYY-MM-DD format');
      }

      if (fromDateObj > toDateObj) {
        throw new Error('From date must be before or equal to to date');
      }

      return {
        subquery: `
          SELECT 
            ${measure === 'Players' ? 'pgs.player_id' : 'tgs.team_id'} as entity_id,
            ${measure === 'Players' ? 'pgs.game_id' : 'tgs.game_id'} as game_id
          FROM ${measure === 'Players' ? 'player_game_stats pgs' : 'team_game_stats tgs'}
          JOIN games g ON ${measure === 'Players' ? 'pgs' : 'tgs'}.game_id = g.id
          WHERE g.game_type = 'regular'
            AND g.game_date >= '${fromDate}'
            AND g.game_date <= '${toDate}'
        `,
        description: `${fromDate} to ${toDate}`
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

  const validTypes = ['all_games', 'last_games', 'game_range', 'home_away', 'last_period', 'date_range'];
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

    case 'last_period':
      if (!organizer.period || !['days', 'weeks', 'months'].includes(organizer.period)) {
        errors.push('Last period organizer requires period to be "days", "weeks", or "months"');
      }
      if (!organizer.value || typeof organizer.value !== 'number' || organizer.value <= 0) {
        errors.push('Last period organizer requires a positive number value');
      }
      // Add reasonable limits
      if (organizer.period === 'days' && organizer.value > 365) {
        errors.push('Last days cannot exceed 365');
      }
      if (organizer.period === 'weeks' && organizer.value > 52) {
        errors.push('Last weeks cannot exceed 52');
      }
      if (organizer.period === 'months' && organizer.value > 12) {
        errors.push('Last months cannot exceed 12');
      }
      break;

    case 'date_range':
      if (!organizer.fromDate) {
        errors.push('Date range organizer requires fromDate');
      }
      if (!organizer.toDate) {
        errors.push('Date range organizer requires toDate');
      }
      
      if (organizer.fromDate && organizer.toDate) {
        const fromDate = new Date(organizer.fromDate);
        const toDate = new Date(organizer.toDate);
        
        if (isNaN(fromDate.getTime())) {
          errors.push('Invalid fromDate format. Use YYYY-MM-DD');
        }
        if (isNaN(toDate.getTime())) {
          errors.push('Invalid toDate format. Use YYYY-MM-DD');
        }
        
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && fromDate > toDate) {
          errors.push('From date must be before or equal to to date');
        }
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
      return `Last ${organizer.value} Games (Per Player/Team)`; // Updated description
    
    case 'game_range':
      return `Games ${organizer.from} to ${organizer.to}`;
    
    case 'home_away':
      return `${organizer.gameType.charAt(0).toUpperCase() + organizer.gameType.slice(1)} Games`;

    case 'last_period':
      const periodLabel = organizer.value === 1 
        ? organizer.period.slice(0, -1) // Remove 's' for singular
        : organizer.period;
      return `Last ${organizer.value} ${periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}`;

    case 'date_range':
      return `${organizer.fromDate} to ${organizer.toDate}`;
    
    default:
      return 'Unknown Organizer';
  }
};

module.exports = {
  buildOrganizerSubquery,
  validateOrganizer,
  getOrganizerDescription
};