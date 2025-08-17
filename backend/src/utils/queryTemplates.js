/**
 * Enhanced SQL query templates supporting both legacy and unified approaches
 */

const getPlayerTraditionalQuery = () => {
  return `
    SELECT 
      p.name,
      t.team_code as team,
      p.age,
      COUNT(*) as games_played,
      ROUND(AVG(pgs.minutes_played), 1) as mins,
      ROUND(AVG(pgs.points), 1) as pts,
      ROUND(AVG(pgs.field_goals_made), 1) as fgm,
      ROUND(AVG(pgs.field_goals_attempted), 1) as fga,
      ROUND(AVG(pgs.field_goal_percentage * 100), 1) as fg_pct,
      ROUND(AVG(pgs.three_pointers_made), 1) as tpm,
      ROUND(AVG(pgs.three_pointers_attempted), 1) as tpa,
      ROUND(AVG(pgs.three_point_percentage * 100), 1) as tp_pct,
      ROUND(AVG(pgs.free_throws_made), 1) as ftm,
      ROUND(AVG(pgs.free_throws_attempted), 1) as fta,
      ROUND(AVG(pgs.free_throw_percentage * 100), 1) as ft_pct,
      ROUND(AVG(pgs.offensive_rebounds), 1) as oreb,
      ROUND(AVG(pgs.defensive_rebounds), 1) as dreb,
      ROUND(AVG(pgs.total_rebounds), 1) as reb,
      ROUND(AVG(pgs.assists), 1) as ast,
      ROUND(AVG(pgs.turnovers), 1) as tov,
      ROUND(AVG(pgs.steals), 1) as stl,
      ROUND(AVG(pgs.blocks), 1) as blk,
      ROUND(AVG(pgs.personal_fouls), 1) as pf,
      ROUND(AVG(pgs.plus_minus), 1) as plus_minus
    FROM players p
    JOIN teams t ON p.team_id = t.id
    JOIN player_game_stats pgs ON p.id = pgs.player_id
    JOIN games g ON pgs.game_id = g.id
    WHERE 1=1
  `;
};

const getPlayerAdvancedQuery = () => {
  return `
    SELECT 
      p.name,
      t.team_code as team,
      p.age,
      COUNT(*) as games_played,
      ROUND(AVG(pas.offensive_rating), 1) as offensive_rating,
      ROUND(AVG(pas.defensive_rating), 1) as defensive_rating,
      ROUND(AVG(pas.net_rating), 1) as net_rating,
      ROUND(AVG(pas.usage_percentage * 100), 1) as usage_percentage,
      ROUND(AVG(pas.true_shooting_percentage * 100), 1) as true_shooting_percentage,
      ROUND(AVG(pas.effective_field_goal_percentage * 100), 1) as effective_field_goal_percentage,
      ROUND(AVG(pas.assist_percentage * 100), 1) as assist_percentage,
      ROUND(AVG(pas.assist_turnover_ratio), 2) as assist_turnover_ratio,
      ROUND(AVG(pas.assist_ratio), 2) as assist_ratio,
      ROUND(AVG(pas.offensive_rebound_percentage * 100), 1) as offensive_rebound_percentage,
      ROUND(AVG(pas.defensive_rebound_percentage * 100), 1) as defensive_rebound_percentage,
      ROUND(AVG(pas.rebound_percentage * 100), 1) as rebound_percentage,
      ROUND(AVG(pas.turnover_percentage * 100), 1) as turnover_percentage,
      ROUND(AVG(pas.pie), 3) as pie,
      ROUND(AVG(pas.pace), 1) as pace
    FROM players p
    JOIN teams t ON p.team_id = t.id
    JOIN player_advanced_stats pas ON p.id = pas.player_id
    JOIN games g ON pas.game_id = g.id
    WHERE 1=1
  `;
};

const getTeamTraditionalQuery = () => {
  return `
    SELECT 
      t.team_code as team,
      COUNT(*) as games_played,
      SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END) as losses,
      ROUND(SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_pct,
      ROUND(AVG(tgs.points), 1) as pts,
      ROUND(AVG(tgs.field_goals_made), 1) as fgm,
      ROUND(AVG(tgs.field_goals_attempted), 1) as fga,
      ROUND(AVG(tgs.field_goal_percentage * 100), 1) as fg_pct,
      ROUND(AVG(tgs.three_pointers_made), 1) as tpm,
      ROUND(AVG(tgs.three_pointers_attempted), 1) as tpa,
      ROUND(AVG(tgs.three_point_percentage * 100), 1) as tp_pct,
      ROUND(AVG(tgs.free_throws_made), 1) as ftm,
      ROUND(AVG(tgs.free_throws_attempted), 1) as fta,
      ROUND(AVG(tgs.free_throw_percentage * 100), 1) as ft_pct,
      ROUND(AVG(tgs.offensive_rebounds), 1) as oreb,
      ROUND(AVG(tgs.defensive_rebounds), 1) as dreb,
      ROUND(AVG(tgs.total_rebounds), 1) as reb,
      ROUND(AVG(tgs.assists), 1) as ast,
      ROUND(AVG(tgs.turnovers), 1) as tov,
      ROUND(AVG(tgs.steals), 1) as stl,
      ROUND(AVG(tgs.blocks), 1) as blk,
      ROUND(AVG(tgs.plus_minus), 1) as plus_minus
    FROM teams t
    JOIN team_game_stats tgs ON t.id = tgs.team_id
    JOIN games g ON tgs.game_id = g.id
    WHERE 1=1
  `;
};

const getTeamAdvancedQuery = () => {
  return `
    SELECT 
      t.team_code as team,
      COUNT(*) as games_played,
      ROUND(AVG(tas.offensive_rating), 1) as offensive_rating,
      ROUND(AVG(tas.defensive_rating), 1) as defensive_rating,
      ROUND(AVG(tas.net_rating), 1) as net_rating,
      ROUND(AVG(tas.true_shooting_percentage * 100), 1) as true_shooting_percentage,
      ROUND(AVG(tas.effective_field_goal_percentage * 100), 1) as effective_field_goal_percentage,
      ROUND(AVG(tas.assist_percentage * 100), 1) as assist_percentage,
      ROUND(AVG(tas.assist_turnover_ratio), 2) as assist_turnover_ratio,
      ROUND(AVG(tas.offensive_rebound_percentage * 100), 1) as offensive_rebound_percentage,
      ROUND(AVG(tas.defensive_rebound_percentage * 100), 1) as defensive_rebound_percentage,
      ROUND(AVG(tas.rebound_percentage * 100), 1) as rebound_percentage,
      ROUND(AVG(tas.turnover_percentage * 100), 1) as turnover_percentage,
      ROUND(AVG(tas.pie), 3) as pie,
      ROUND(AVG(tas.pace), 1) as pace
    FROM teams t
    JOIN team_advanced_stats tas ON t.id = tas.team_id
    JOIN games g ON tas.game_id = g.id
    WHERE 1=1
  `;
};

const getBaseQuery = (measure, isAdvanced = false) => {
  if (measure === 'Players') {
    return isAdvanced ? getPlayerAdvancedQuery() : getPlayerTraditionalQuery();
  } else {
    return isAdvanced ? getTeamAdvancedQuery() : getTeamTraditionalQuery();
  }
};

const getGroupByClause = (measure, isAdvanced = false) => {
  if (measure === 'Players') {
    return ` GROUP BY p.id, p.name, t.team_code, p.age`;
  } else {
    return ` GROUP BY t.id, t.team_code`;
  }
};

const getJoinClause = (measure, isAdvanced = false) => {
  // For more complex queries that might need custom joins
  if (measure === 'Players') {
    if (isAdvanced) {
      return `
        JOIN teams t ON p.team_id = t.id
        JOIN player_advanced_stats pas ON p.id = pas.player_id
        JOIN games g ON pas.game_id = g.id
      `;
    } else {
      return `
        JOIN teams t ON p.team_id = t.id
        JOIN player_game_stats pgs ON p.id = pgs.player_id
        JOIN games g ON pgs.game_id = g.id
      `;
    }
  } else {
    if (isAdvanced) {
      return `
        JOIN team_advanced_stats tas ON t.id = tas.team_id
        JOIN games g ON tas.game_id = g.id
      `;
    } else {
      return `
        JOIN team_game_stats tgs ON t.id = tgs.team_id
        JOIN games g ON tgs.game_id = g.id
      `;
    }
  }
};

const getSelectClause = (measure, isAdvanced = false) => {
  // For building custom select clauses
  if (measure === 'Players') {
    const baseSelect = `
      p.name,
      t.team_code as team,
      p.age,
      COUNT(*) as games_played
    `;
    
    if (isAdvanced) {
      return baseSelect + `,
        ROUND(AVG(pas.offensive_rating), 1) as offensive_rating,
        ROUND(AVG(pas.defensive_rating), 1) as defensive_rating,
        ROUND(AVG(pas.net_rating), 1) as net_rating,
        ROUND(AVG(pas.usage_percentage * 100), 1) as usage_percentage,
        ROUND(AVG(pas.true_shooting_percentage * 100), 1) as true_shooting_percentage,
        ROUND(AVG(pas.effective_field_goal_percentage * 100), 1) as effective_field_goal_percentage,
        ROUND(AVG(pas.assist_percentage * 100), 1) as assist_percentage,
        ROUND(AVG(pas.assist_turnover_ratio), 2) as assist_turnover_ratio,
        ROUND(AVG(pas.assist_ratio), 2) as assist_ratio,
        ROUND(AVG(pas.offensive_rebound_percentage * 100), 1) as offensive_rebound_percentage,
        ROUND(AVG(pas.defensive_rebound_percentage * 100), 1) as defensive_rebound_percentage,
        ROUND(AVG(pas.rebound_percentage * 100), 1) as rebound_percentage,
        ROUND(AVG(pas.turnover_percentage * 100), 1) as turnover_percentage,
        ROUND(AVG(pas.pie), 3) as pie,
        ROUND(AVG(pas.pace), 1) as pace
      `;
    } else {
      return baseSelect + `,
        ROUND(AVG(pgs.minutes_played), 1) as mins,
        ROUND(AVG(pgs.points), 1) as pts,
        ROUND(AVG(pgs.field_goals_made), 1) as fgm,
        ROUND(AVG(pgs.field_goals_attempted), 1) as fga,
        ROUND(AVG(pgs.field_goal_percentage * 100), 1) as fg_pct,
        ROUND(AVG(pgs.three_pointers_made), 1) as tpm,
        ROUND(AVG(pgs.three_pointers_attempted), 1) as tpa,
        ROUND(AVG(pgs.three_point_percentage * 100), 1) as tp_pct,
        ROUND(AVG(pgs.free_throws_made), 1) as ftm,
        ROUND(AVG(pgs.free_throws_attempted), 1) as fta,
        ROUND(AVG(pgs.free_throw_percentage * 100), 1) as ft_pct,
        ROUND(AVG(pgs.offensive_rebounds), 1) as oreb,
        ROUND(AVG(pgs.defensive_rebounds), 1) as dreb,
        ROUND(AVG(pgs.total_rebounds), 1) as reb,
        ROUND(AVG(pgs.assists), 1) as ast,
        ROUND(AVG(pgs.turnovers), 1) as tov,
        ROUND(AVG(pgs.steals), 1) as stl,
        ROUND(AVG(pgs.blocks), 1) as blk,
        ROUND(AVG(pgs.personal_fouls), 1) as pf,
        ROUND(AVG(pgs.plus_minus), 1) as plus_minus
      `;
    }
  } else {
    const baseSelect = `
      t.team_code as team,
      COUNT(*) as games_played
    `;
    
    if (isAdvanced) {
      return baseSelect + `,
        ROUND(AVG(tas.offensive_rating), 1) as offensive_rating,
        ROUND(AVG(tas.defensive_rating), 1) as defensive_rating,
        ROUND(AVG(tas.net_rating), 1) as net_rating,
        ROUND(AVG(tas.true_shooting_percentage * 100), 1) as true_shooting_percentage,
        ROUND(AVG(tas.effective_field_goal_percentage * 100), 1) as effective_field_goal_percentage,
        ROUND(AVG(tas.assist_percentage * 100), 1) as assist_percentage,
        ROUND(AVG(tas.assist_turnover_ratio), 2) as assist_turnover_ratio,
        ROUND(AVG(tas.offensive_rebound_percentage * 100), 1) as offensive_rebound_percentage,
        ROUND(AVG(tas.defensive_rebound_percentage * 100), 1) as defensive_rebound_percentage,
        ROUND(AVG(tas.rebound_percentage * 100), 1) as rebound_percentage,
        ROUND(AVG(tas.turnover_percentage * 100), 1) as turnover_percentage,
        ROUND(AVG(tas.pie), 3) as pie,
        ROUND(AVG(tas.pace), 1) as pace
      `;
    } else {
      return baseSelect + `,
        SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN tgs.win = FALSE THEN 1 ELSE 0 END) as losses,
        ROUND(SUM(CASE WHEN tgs.win = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_pct,
        ROUND(AVG(tgs.points), 1) as pts,
        ROUND(AVG(tgs.field_goals_made), 1) as fgm,
        ROUND(AVG(tgs.field_goals_attempted), 1) as fga,
        ROUND(AVG(tgs.field_goal_percentage * 100), 1) as fg_pct,
        ROUND(AVG(tgs.three_pointers_made), 1) as tpm,
        ROUND(AVG(tgs.three_pointers_attempted), 1) as tpa,
        ROUND(AVG(tgs.three_point_percentage * 100), 1) as tp_pct,
        ROUND(AVG(tgs.free_throws_made), 1) as ftm,
        ROUND(AVG(tgs.free_throws_attempted), 1) as fta,
        ROUND(AVG(tgs.free_throw_percentage * 100), 1) as ft_pct,
        ROUND(AVG(tgs.offensive_rebounds), 1) as oreb,
        ROUND(AVG(tgs.defensive_rebounds), 1) as dreb,
        ROUND(AVG(tgs.total_rebounds), 1) as reb,
        ROUND(AVG(tgs.assists), 1) as ast,
        ROUND(AVG(tgs.turnovers), 1) as tov,
        ROUND(AVG(tgs.steals), 1) as stl,
        ROUND(AVG(tgs.blocks), 1) as blk,
        ROUND(AVG(tgs.plus_minus), 1) as plus_minus
      `;
    }
  }
};

module.exports = {
  getBaseQuery,
  getGroupByClause,
  getJoinClause,
  getSelectClause,
  getPlayerTraditionalQuery,
  getPlayerAdvancedQuery,
  getTeamTraditionalQuery,
  getTeamAdvancedQuery
};