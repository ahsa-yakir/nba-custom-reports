// Updated mock data with comprehensive NBA stats
export const mockPlayerData = [
    { 
      id: 1, name: 'LeBron James', team: 'LAL', age: 39, gamesPlayed: 55, mins: 35.3, pts: 25.7, fgm: 9.5, fga: 18.5, fg_pct: 54.0, 
      tpm: 2.1, tpa: 5.1, tp_pct: 41.0, ftm: 4.6, fta: 6.3, ft_pct: 73.2, oreb: 1.4, dreb: 6.2, reb: 7.6, ast: 7.3, 
      tov: 3.5, stl: 1.3, blk: 0.6, pf: 1.8, plusMinus: 2.1, dayOfWeek: 'Monday', gameType: 'Home'
    },
    { 
      id: 2, name: 'Stephen Curry', team: 'GSW', age: 36, gamesPlayed: 56, mins: 32.7, pts: 26.4, fgm: 9.0, fga: 20.1, fg_pct: 42.7, 
      tpm: 4.8, tpa: 11.9, tp_pct: 40.3, ftm: 3.6, fta: 3.9, ft_pct: 91.5, oreb: 0.8, dreb: 4.5, reb: 5.3, ast: 5.1, 
      tov: 3.1, stl: 0.9, blk: 0.4, pf: 1.6, plusMinus: 8.2, dayOfWeek: 'Tuesday', gameType: 'Away'
    },
    { 
      id: 3, name: 'Luka Dončić', team: 'DAL', age: 25, gamesPlayed: 50, mins: 36.2, pts: 32.4, fgm: 11.6, fga: 25.6, fg_pct: 45.4, 
      tpm: 3.6, tpa: 9.9, tp_pct: 36.2, ftm: 5.6, fta: 7.1, ft_pct: 78.6, oreb: 1.4, dreb: 7.8, reb: 9.2, ast: 9.1, 
      tov: 4.1, stl: 1.4, blk: 0.5, pf: 2.4, plusMinus: 5.3, dayOfWeek: 'Wednesday', gameType: 'Home'
    },
    { 
      id: 4, name: 'Giannis Antetokounmpo', team: 'MIL', age: 29, gamesPlayed: 58, mins: 35.2, pts: 31.1, fgm: 11.5, fga: 20.8, fg_pct: 55.3, 
      tpm: 0.6, tpa: 2.2, tp_pct: 27.4, ftm: 7.5, fta: 11.6, ft_pct: 64.6, oreb: 2.9, dreb: 8.9, reb: 11.8, ast: 5.7, 
      tov: 3.4, stl: 1.2, blk: 1.1, pf: 3.1, plusMinus: 6.8, dayOfWeek: 'Thursday', gameType: 'Away'
    },
    { 
      id: 5, name: 'Jayson Tatum', team: 'BOS', age: 26, gamesPlayed: 60, mins: 35.8, pts: 30.1, fgm: 10.9, fga: 23.4, fg_pct: 46.6, 
      tpm: 3.4, tpa: 9.8, tp_pct: 34.8, ftm: 5.0, fta: 5.8, ft_pct: 85.3, oreb: 1.1, dreb: 7.7, reb: 8.8, ast: 4.6, 
      tov: 2.8, stl: 1.0, blk: 0.6, pf: 2.2, plusMinus: 9.1, dayOfWeek: 'Friday', gameType: 'Home'
    },
    { 
      id: 6, name: 'Joel Embiid', team: 'PHI', age: 30, gamesPlayed: 46, mins: 34.6, pts: 33.1, fgm: 11.6, fga: 21.2, fg_pct: 54.8, 
      tpm: 1.2, tpa: 3.6, tp_pct: 33.0, ftm: 8.7, fta: 10.2, ft_pct: 85.7, oreb: 2.4, dreb: 8.4, reb: 10.8, ast: 4.2, 
      tov: 3.4, stl: 1.1, blk: 1.7, pf: 3.3, plusMinus: 4.2, dayOfWeek: 'Saturday', gameType: 'Away'
    },
    { 
      id: 7, name: 'Nikola Jokić', team: 'DEN', age: 29, gamesPlayed: 62, mins: 34.6, pts: 26.4, fgm: 10.7, fga: 18.4, fg_pct: 58.3, 
      tpm: 1.3, tpa: 3.4, tp_pct: 38.3, ftm: 3.7, fta: 4.5, ft_pct: 82.2, oreb: 2.9, dreb: 9.8, reb: 12.7, ast: 9.0, 
      tov: 3.0, stl: 1.3, blk: 0.9, pf: 2.7, plusMinus: 7.5, dayOfWeek: 'Sunday', gameType: 'Home'
    },
    { 
      id: 8, name: 'Shai Gilgeous-Alexander', team: 'OKC', age: 26, gamesPlayed: 55, mins: 34.5, pts: 31.4, fgm: 11.3, fga: 21.2, fg_pct: 53.5, 
      tpm: 1.6, tpa: 4.6, tp_pct: 34.5, ftm: 7.2, fta: 8.3, ft_pct: 86.7, oreb: 1.1, dreb: 4.4, reb: 5.5, ast: 5.5, 
      tov: 2.8, stl: 2.0, blk: 0.9, pf: 2.3, plusMinus: 8.9, dayOfWeek: 'Monday', gameType: 'Away'
    },
  ];
  
  export const mockTeamData = [
    { 
      team: 'BOS', gamesPlayed: 60, wins: 48, losses: 12, winPct: 80.0, pts: 120.6, fgm: 44.2, fga: 91.9, fg_pct: 48.1, 
      tpm: 16.5, tpa: 43.7, tp_pct: 37.7, ftm: 15.7, fta: 20.5, ft_pct: 76.6, oreb: 10.2, dreb: 36.1, reb: 46.3, 
      ast: 26.8, tov: 13.2, stl: 7.8, blk: 5.9, plusMinus: 10.7, dayOfWeek: 'Monday', gameType: 'Home'
    },
    { 
      team: 'MIL', gamesPlayed: 60, wins: 44, losses: 16, winPct: 73.3, pts: 118.8, fgm: 43.6, fga: 89.6, fg_pct: 48.7, 
      tpm: 14.8, tpa: 38.4, tp_pct: 38.5, ftm: 16.8, fta: 21.9, ft_pct: 76.7, oreb: 11.1, dreb: 36.0, reb: 47.1, 
      ast: 25.4, tov: 14.1, stl: 7.2, blk: 5.3, plusMinus: 6.5, dayOfWeek: 'Tuesday', gameType: 'Away'
    },
    { 
      team: 'PHI', gamesPlayed: 60, wins: 41, losses: 19, winPct: 68.3, pts: 114.7, fgm: 41.8, fga: 87.6, fg_pct: 47.7, 
      tpm: 13.2, tpa: 36.0, tp_pct: 36.7, ftm: 17.9, fta: 23.1, ft_pct: 77.5, oreb: 9.8, dreb: 33.0, reb: 42.8, 
      ast: 24.1, tov: 12.8, stl: 7.6, blk: 5.4, plusMinus: 4.9, dayOfWeek: 'Wednesday', gameType: 'Home'
    },
    { 
      team: 'LAL', gamesPlayed: 60, wins: 35, losses: 25, winPct: 58.3, pts: 116.2, fgm: 42.9, fga: 88.5, fg_pct: 48.5, 
      tpm: 12.8, tpa: 36.0, tp_pct: 35.6, ftm: 17.6, fta: 22.3, ft_pct: 78.9, oreb: 10.4, dreb: 33.8, reb: 44.2, 
      ast: 26.3, tov: 15.2, stl: 7.1, blk: 5.8, plusMinus: 1.1, dayOfWeek: 'Thursday', gameType: 'Away'
    },
    { 
      team: 'GSW', gamesPlayed: 60, wins: 38, losses: 22, winPct: 63.3, pts: 118.4, fgm: 42.8, fga: 92.1, fg_pct: 46.5, 
      tpm: 17.2, tpa: 44.3, tp_pct: 38.8, ftm: 15.6, fta: 19.8, ft_pct: 78.8, oreb: 9.7, dreb: 35.1, reb: 44.8, 
      ast: 28.2, tov: 14.8, stl: 8.4, blk: 4.9, plusMinus: 3.6, dayOfWeek: 'Friday', gameType: 'Home'
    },
    { 
      team: 'DAL', gamesPlayed: 60, wins: 32, losses: 28, winPct: 53.3, pts: 115.9, fgm: 42.1, fga: 89.4, fg_pct: 47.1, 
      tpm: 14.6, tpa: 40.3, tp_pct: 36.1, ftm: 17.1, fta: 22.0, ft_pct: 77.7, oreb: 9.9, dreb: 32.2, reb: 42.1, 
      ast: 24.9, tov: 13.5, stl: 6.9, blk: 4.8, plusMinus: 2.2, dayOfWeek: 'Saturday', gameType: 'Away'
    },
  ];
  
  // Filter options based on measure selection
  export const getFilterOptions = (measure) => {
    if (measure === 'Teams') {
      return [
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
      ];
    } else if (measure === 'Players') {
      return [
        { type: 'Team', operators: ['equals', 'in'], options: ['BOS', 'MIL', 'PHI', 'LAL', 'GSW', 'DAL', 'DEN', 'OKC'] },
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
      ];
    }
    return [];
  };
  
  export const organizerOptions = [
    { type: 'Day of Week', values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
    { type: 'Date', values: [] },
    { type: 'Team', values: [] },
    { type: 'Game Type', values: ['Home', 'Away'] }
  ];