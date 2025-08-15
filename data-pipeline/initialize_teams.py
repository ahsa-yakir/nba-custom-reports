#!/usr/bin/env python3
"""
NBA Teams Initializer
Fetches and loads all NBA teams from static data into PostgreSQL
"""

import psycopg2
from psycopg2.extras import execute_values
from typing import Dict, List
import logging

# NBA API imports
try:
    from nba_api.stats.static import teams as nba_teams
    NBA_API_AVAILABLE = True
except ImportError:
    NBA_API_AVAILABLE = False
    print("❌ nba_api package not found. Please install with: pip install nba_api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_team_conference_division(team_id: str, team_name: str) -> tuple:
    """
    Determine conference and division for NBA teams
    Returns (conference, division)
    """
    
    # Eastern Conference teams
    eastern_teams = {
        # Atlantic Division
        '1610612738': ('Eastern', 'Atlantic'),  # Boston Celtics
        '1610612751': ('Eastern', 'Atlantic'),  # Brooklyn Nets
        '1610612752': ('Eastern', 'Atlantic'),  # New York Knicks
        '1610612755': ('Eastern', 'Atlantic'),  # Philadelphia 76ers
        '1610612761': ('Eastern', 'Atlantic'),  # Toronto Raptors
        
        # Central Division
        '1610612741': ('Eastern', 'Central'),   # Chicago Bulls
        '1610612739': ('Eastern', 'Central'),   # Cleveland Cavaliers
        '1610612765': ('Eastern', 'Central'),   # Detroit Pistons
        '1610612754': ('Eastern', 'Central'),   # Indiana Pacers
        '1610612749': ('Eastern', 'Central'),   # Milwaukee Bucks
        
        # Southeast Division
        '1610612737': ('Eastern', 'Southeast'), # Atlanta Hawks
        '1610612766': ('Eastern', 'Southeast'), # Charlotte Hornets
        '1610612748': ('Eastern', 'Southeast'), # Miami Heat
        '1610612753': ('Eastern', 'Southeast'), # Orlando Magic
        '1610612764': ('Eastern', 'Southeast'), # Washington Wizards
    }
    
    # Western Conference teams
    western_teams = {
        # Northwest Division
        '1610612743': ('Western', 'Northwest'),  # Denver Nuggets
        '1610612750': ('Western', 'Northwest'),  # Minnesota Timberwolves
        '1610612760': ('Western', 'Northwest'),  # Oklahoma City Thunder
        '1610612757': ('Western', 'Northwest'),  # Portland Trail Blazers
        '1610612762': ('Western', 'Northwest'),  # Utah Jazz
        
        # Pacific Division
        '1610612744': ('Western', 'Pacific'),    # Golden State Warriors
        '1610612746': ('Western', 'Pacific'),    # LA Clippers
        '1610612747': ('Western', 'Pacific'),    # Los Angeles Lakers
        '1610612756': ('Western', 'Pacific'),    # Phoenix Suns
        '1610612758': ('Western', 'Pacific'),    # Sacramento Kings
        
        # Southwest Division
        '1610612742': ('Western', 'Southwest'),  # Dallas Mavericks
        '1610612745': ('Western', 'Southwest'),  # Houston Rockets
        '1610612763': ('Western', 'Southwest'),  # Memphis Grizzlies
        '1610612740': ('Western', 'Southwest'),  # New Orleans Pelicans
        '1610612759': ('Western', 'Southwest'),  # San Antonio Spurs
    }
    
    # Check both dictionaries
    if team_id in eastern_teams:
        return eastern_teams[team_id]
    elif team_id in western_teams:
        return western_teams[team_id]
    else:
        # Fallback for unknown teams
        logger.warning(f"Unknown team ID {team_id} ({team_name}), defaulting to Western/Pacific")
        return ('Western', 'Pacific')

class TeamInitializer:
    """Initialize NBA teams from static data"""
    
    def __init__(self, db_config: Dict[str, str]):
        """Initialize with database configuration"""
        if not NBA_API_AVAILABLE:
            raise ImportError("nba_api package is required. Install with: pip install nba_api")
            
        self.db_config = db_config
    
    def get_connection(self) -> psycopg2.extensions.connection:
        """Create database connection"""
        return psycopg2.connect(**self.db_config)
    
    def fetch_nba_teams(self) -> List[Dict]:
        """Fetch all NBA teams using the nba_api static data"""
        logger.info("🏀 Fetching NBA teams from static data...")
        
        try:
            # Get teams from nba_api static data
            teams_data = nba_teams.get_teams()
            
            logger.info(f"Found {len(teams_data)} NBA teams")
            return teams_data
            
        except Exception as e:
            logger.error(f"Error fetching teams: {e}")
            raise
    
    def clear_teams_table(self):
        """Clear existing teams data (and dependent data due to foreign key constraints)"""
        logger.info("🧹 Clearing existing teams data...")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Delete in correct order to respect foreign keys
            logger.info("  - Clearing player game stats...")
            cursor.execute('DELETE FROM player_game_stats')
            
            logger.info("  - Clearing team game stats...")
            cursor.execute('DELETE FROM team_game_stats')
            
            logger.info("  - Clearing games...")
            cursor.execute('DELETE FROM games')
            
            logger.info("  - Clearing players...")
            cursor.execute('DELETE FROM players')
            
            logger.info("  - Clearing teams...")
            cursor.execute('DELETE FROM teams')
            
            conn.commit()
            cursor.close()
            
        logger.info("✅ Teams table (and dependent data) cleared")
    
    def insert_teams(self, teams_data: List[Dict]):
        """Insert NBA teams into database with correct conference/division"""
        logger.info("📊 Inserting NBA teams into database...")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            teams_to_insert = []
            for team in teams_data:
                team_id = str(team['id'])
                abbreviation = team['abbreviation']
                full_name = team['full_name'] 
                city = team['city']
                
                # Get correct conference and division
                conference, division = get_team_conference_division(team_id, full_name)
                
                teams_to_insert.append((
                    team_id, abbreviation, full_name, city, conference, division
                ))
            
            # Batch insert all teams
            execute_values(
                cursor,
                """INSERT INTO teams (id, team_code, team_name, city, conference, division)
                   VALUES %s ON CONFLICT (id) DO UPDATE SET
                   team_code = EXCLUDED.team_code,
                   team_name = EXCLUDED.team_name,
                   city = EXCLUDED.city,
                   conference = EXCLUDED.conference,
                   division = EXCLUDED.division,
                   updated_at = CURRENT_TIMESTAMP""",
                teams_to_insert
            )
            
            conn.commit()
            cursor.close()
            
        logger.info(f"✅ Inserted {len(teams_data)} teams")
    
    def initialize_teams(self, clear_existing: bool = True):
        """Main method to initialize all NBA teams"""
        logger.info("🚀 Starting NBA teams initialization...")
        
        try:
            if clear_existing:
                self.clear_teams_table()
            
            # Fetch and insert teams
            teams_data = self.fetch_nba_teams()
            self.insert_teams(teams_data)
            
            logger.info("🎉 Teams initialization completed successfully!")
            
        except Exception as e:
            logger.error(f"Teams initialization failed: {e}")
            raise

def main():
    """Example usage"""
    # Database configuration
    db_config = {
        'host': 'localhost',
        'database': 'nba_analytics',
        'user': 'nba_user',
        'password': 'your_password',
        'port': 5432
    }
    
    # Initialize teams
    initializer = TeamInitializer(db_config)
    initializer.initialize_teams()

if __name__ == "__main__":
    main()