export const formatApiResults = (results) => {
  return results.map(item => {
    const baseData = {
      name: item.name,
      team: item.team || item.team_code,
      age: parseInt(item.age) || 0,
      gamesPlayed: parseInt(item.games_played) || 0,
      mins: parseFloat(item.mins) || 0,
      wins: parseInt(item.wins) || 0,
      losses: parseInt(item.losses) || 0,
      winPct: parseFloat(item.win_pct) || 0,
      pts: parseFloat(item.pts) || 0,
      fgm: parseFloat(item.fgm) || 0,
      fga: parseFloat(item.fga) || 0,
      fg_pct: parseFloat(item.fg_pct) || 0,
      tpm: parseFloat(item.tpm) || 0,
      tpa: parseFloat(item.tpa) || 0,
      tp_pct: parseFloat(item.tp_pct) || 0,
      ftm: parseFloat(item.ftm) || 0,
      fta: parseFloat(item.fta) || 0,
      ft_pct: parseFloat(item.ft_pct) || 0,
      oreb: parseFloat(item.oreb) || 0,
      dreb: parseFloat(item.dreb) || 0,
      reb: parseFloat(item.reb) || 0,
      ast: parseFloat(item.ast) || 0,
      tov: parseFloat(item.tov) || 0,
      stl: parseFloat(item.stl) || 0,
      blk: parseFloat(item.blk) || 0,
      pf: parseFloat(item.pf) || 0,
      plusMinus: parseFloat(item.plus_minus) || 0
    };

    // Add advanced stats
    baseData.offensiveRating = parseFloat(item.offensive_rating) || 0;
    baseData.defensiveRating = parseFloat(item.defensive_rating) || 0;
    baseData.netRating = parseFloat(item.net_rating) || 0;
    baseData.usagePercentage = parseFloat(item.usage_percentage) || 0;
    baseData.trueShootingPercentage = parseFloat(item.true_shooting_percentage) || 0;
    baseData.effectiveFieldGoalPercentage = parseFloat(item.effective_field_goal_percentage) || 0;
    baseData.assistPercentage = parseFloat(item.assist_percentage) || 0;
    baseData.assistTurnoverRatio = parseFloat(item.assist_turnover_ratio) || 0;
    baseData.assistRatio = parseFloat(item.assist_ratio) || 0;
    baseData.offensiveReboundPercentage = parseFloat(item.offensive_rebound_percentage) || 0;
    baseData.defensiveReboundPercentage = parseFloat(item.defensive_rebound_percentage) || 0;
    baseData.reboundPercentage = parseFloat(item.rebound_percentage) || 0;
    baseData.turnoverPercentage = parseFloat(item.turnover_percentage) || 0;
    baseData.pie = parseFloat(item.pie) || 0;
    baseData.pace = parseFloat(item.pace) || 0;

    return baseData;
  });
};

export const getTableColumns = (viewType, measure) => {
  if (viewType === 'advanced') {
    if (measure === 'Teams') {
      return ['Team', 'Games Played', 'Offensive Rating', 'Defensive Rating', 'Net Rating', 'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %', 'Turnover %', 'PIE', 'Pace'];
    } else {
      return ['Name', 'TEAM', 'AGE', 'Games Played', 'Offensive Rating', 'Defensive Rating', 'Net Rating', 'Usage %', 'True Shooting %', 'Effective FG%', 'Assist %', 'Assist Turnover Ratio', 'Assist Ratio', 'Offensive Rebound %', 'Defensive Rebound %', 'Rebound %', 'Turnover %', 'PIE', 'Pace'];
    }
  } else {
    if (measure === 'Teams') {
      return ['Team', 'Games Played', 'Wins', 'Losses', 'Win %', 'PTS', 'FGM', 'FGA', 'FG%', '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-'];
    } else {
      return ['Name', 'TEAM', 'AGE', 'Games Played', 'MINS', 'PTS', 'FGM', 'FGA', 'FG%', '3PM', '3PA', '3P%', 'FTM', 'FTA', 'FT%', 'OREB', 'DREB', 'REB', 'AST', 'TOV', 'STL', 'BLK', '+/-'];
    }
  }
};

export const formatTableValue = (value, column) => {
  if (column.includes('%') || column.includes('Rating') || column === 'PIE' || column === 'Pace') {
    return typeof value === 'number' ? value.toFixed(1) : value;
  }
  return typeof value === 'number' ? value.toFixed(1) : value;
};

export const getValueForColumn = (item, column) => {
  const columnMap = {
    // Traditional columns
    'Team': 'team', 'Name': 'name', 'TEAM': 'team', 'AGE': 'age',
    'Games Played': 'gamesPlayed', 'Wins': 'wins', 'Losses': 'losses', 'Win %': 'winPct',
    'PTS': 'pts', 'MINS': 'mins', 'FGM': 'fgm', 'FGA': 'fga', 'FG%': 'fg_pct',
    '3PM': 'tpm', '3PA': 'tpa', '3P%': 'tp_pct',
    'FTM': 'ftm', 'FTA': 'fta', 'FT%': 'ft_pct',
    'OREB': 'oreb', 'DREB': 'dreb', 'REB': 'reb',
    'AST': 'ast', 'TOV': 'tov', 'STL': 'stl', 'BLK': 'blk', 'PF': 'pf', '+/-': 'plusMinus',
    
    // Advanced columns
    'Offensive Rating': 'offensiveRating',
    'Defensive Rating': 'defensiveRating',
    'Net Rating': 'netRating',
    'Usage %': 'usagePercentage',
    'True Shooting %': 'trueShootingPercentage',
    'Effective FG%': 'effectiveFieldGoalPercentage',
    'Assist %': 'assistPercentage',
    'Assist Turnover Ratio': 'assistTurnoverRatio',
    'Assist Ratio': 'assistRatio',
    'Offensive Rebound %': 'offensiveReboundPercentage',
    'Defensive Rebound %': 'defensiveReboundPercentage',
    'Rebound %': 'reboundPercentage',
    'Turnover %': 'turnoverPercentage',
    'PIE': 'pie',
    'Pace': 'pace'
  };
  
  return item[columnMap[column]] || '';
};