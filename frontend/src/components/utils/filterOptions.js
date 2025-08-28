export const getFilterOptions = (measure, teams = []) => {
  if (measure === 'Teams') {
    return [
      // Traditional team filters
      { type: 'Wins', operators: ['greater than', 'less than', 'between'] },
      { type: 'Games Played', operators: ['greater than', 'less than', 'between'] },
      { type: 'Points', operators: ['greater than', 'less than', 'between'] },
      { type: 'FGM', operators: ['greater than', 'less than', 'between'] },
      { type: 'FGA', operators: ['greater than', 'less than', 'between'] },
      { type: 'FG%', operators: ['greater than', 'less than', 'between'] },
      { type: '3PM', operators: ['greater than', 'less than', 'between'] },
      { type: 'FTM', operators: ['greater than', 'less than', 'between'] },
      { type: 'FTA', operators: ['greater than', 'less than', 'between'] },
      { type: 'FT%', operators: ['greater than', 'less than', 'between'] },
      { type: 'OREB', operators: ['greater than', 'less than', 'between'] },
      { type: 'DREB', operators: ['greater than', 'less than', 'between'] },
      { type: 'REB', operators: ['greater than', 'less than', 'between'] },
      { type: 'AST', operators: ['greater than', 'less than', 'between'] },
      { type: 'TOV', operators: ['greater than', 'less than', 'between'] },
      { type: 'STL', operators: ['greater than', 'less than', 'between'] },
      { type: 'BLK', operators: ['greater than', 'less than', 'between'] },
      { type: '+/-', operators: ['greater than', 'less than', 'between'] },
      
      // Advanced team filters
      { type: 'Offensive Rating', operators: ['greater than', 'less than', 'between'] },
      { type: 'Defensive Rating', operators: ['greater than', 'less than', 'between'] },
      { type: 'Net Rating', operators: ['greater than', 'less than', 'between'] },
      { type: 'True Shooting %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Effective FG%', operators: ['greater than', 'less than', 'between'] },
      { type: 'Assist %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Assist Turnover Ratio', operators: ['greater than', 'less than', 'between'] },
      { type: 'Offensive Rebound %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Defensive Rebound %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Rebound %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Turnover %', operators: ['greater than', 'less than', 'between'] },
      { type: 'PIE', operators: ['greater than', 'less than', 'between'] },
      { type: 'Pace', operators: ['greater than', 'less than', 'between'] },
    ];
  } else if (measure === 'Players') {
    return [
      // Traditional player filters
      { type: 'Team', operators: ['equals', 'in'], options: teams },
      { type: 'Age', operators: ['greater than', 'less than', 'equals', 'between'] },
      { type: 'Games Played', operators: ['greater than', 'less than', 'between'] },
      { type: 'MINS', operators: ['greater than', 'less than', 'between'] },
      { type: 'PTS', operators: ['greater than', 'less than', 'between'] },
      { type: 'FGM', operators: ['greater than', 'less than', 'between'] },
      { type: 'FGA', operators: ['greater than', 'less than', 'between'] },
      { type: 'FG%', operators: ['greater than', 'less than', 'between'] },
      { type: '3PM', operators: ['greater than', 'less than', 'between'] },
      { type: '3PA', operators: ['greater than', 'less than', 'between'] },
      { type: '3P%', operators: ['greater than', 'less than', 'between'] },
      { type: 'FTM', operators: ['greater than', 'less than', 'between'] },
      { type: 'FTA', operators: ['greater than', 'less than', 'between'] },
      { type: 'FT%', operators: ['greater than', 'less than', 'between'] },
      { type: 'OREB', operators: ['greater than', 'less than', 'between'] },
      { type: 'DREB', operators: ['greater than', 'less than', 'between'] },
      { type: 'REB', operators: ['greater than', 'less than', 'between'] },
      { type: 'AST', operators: ['greater than', 'less than', 'between'] },
      { type: 'TOV', operators: ['greater than', 'less than', 'between'] },
      { type: 'BLK', operators: ['greater than', 'less than', 'between'] },
      { type: 'PF', operators: ['greater than', 'less than', 'between'] },
      { type: '+/-', operators: ['greater than', 'less than', 'between'] },
      
      // Advanced player filters
      { type: 'Offensive Rating', operators: ['greater than', 'less than', 'between'] },
      { type: 'Defensive Rating', operators: ['greater than', 'less than', 'between'] },
      { type: 'Net Rating', operators: ['greater than', 'less than', 'between'] },
      { type: 'Usage %', operators: ['greater than', 'less than', 'between'] },
      { type: 'True Shooting %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Effective FG%', operators: ['greater than', 'less than', 'between'] },
      { type: 'Assist %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Assist Turnover Ratio', operators: ['greater than', 'less than', 'between'] },
      { type: 'Assist Ratio', operators: ['greater than', 'less than', 'between'] },
      { type: 'Offensive Rebound %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Defensive Rebound %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Rebound %', operators: ['greater than', 'less than', 'between'] },
      { type: 'Turnover %', operators: ['greater than', 'less than', 'between'] },
      { type: 'PIE', operators: ['greater than', 'less than', 'between'] },
      { type: 'Pace', operators: ['greater than', 'less than', 'between'] },
    ];
  }
  return [];
};