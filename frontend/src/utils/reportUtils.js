export const getStatKey = (statLabel) => {
  const statMap = {
    // Traditional team stats
    'Wins': 'wins', 
    'Games Played': 'gamesPlayed', 
    'Points': 'pts', 
    'FGM': 'fgm', 
    'FGA': 'fga', 
    'FG%': 'fg_pct',
    '3PM': 'tpm', 
    'FTM': 'ftm', 
    'FTA': 'fta', 
    'FT%': 'ft_pct', 
    'OREB': 'oreb', 
    'DREB': 'dreb', 
    'REB': 'reb',
    'AST': 'ast', 
    'TOV': 'tov', 
    'STL': 'stl', 
    'BLK': 'blk', 
    '+/-': 'plusMinus',
    
    // Traditional player stats
    'Team': 'team', 
    'Age': 'age', 
    'MINS': 'mins', 
    'PTS': 'pts', 
    '3PA': 'tpa', 
    '3P%': 'tp_pct', 
    'PF': 'pf',
    
    // Advanced stats (both players and teams)
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
  
  return statMap[statLabel] || statLabel.toLowerCase();
};

export const applyFilters = (data, filters) => {
  let filteredData = [...data];

  filters.forEach(filter => {
    const statKey = getStatKey(filter.type);
    
    switch (filter.operator) {
      case 'equals':
        filteredData = filteredData.filter(item => item[statKey] === filter.value);
        break;
      case 'in':
        filteredData = filteredData.filter(item => filter.values.includes(item[statKey]));
        break;
      case 'greater than':
        filteredData = filteredData.filter(item => item[statKey] > parseFloat(filter.value));
        break;
      case 'less than':
        filteredData = filteredData.filter(item => item[statKey] < parseFloat(filter.value));
        break;
      case 'between':
        filteredData = filteredData.filter(item => 
          item[statKey] >= parseFloat(filter.value) && item[statKey] <= parseFloat(filter.value2)
        );
        break;
    }
  });

  return filteredData;
};

export const organizeData = (data, organizer) => {
  if (!organizer.type) {
    return data;
  }

  const grouped = {};
  
  data.forEach(item => {
    let key = '';
    switch (organizer.type) {
      case 'Day of Week':
        key = item.dayOfWeek;
        break;
      case 'Team':
        key = item.team;
        break;
      case 'Game Type':
        key = item.gameType;
        break;
      default:
        key = 'All';
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  return Object.entries(grouped).map(([key, items]) => ({
    category: key,
    count: items.length,
    items: items
  }));
};