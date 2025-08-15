#!/usr/bin/env python3
"""
NBA Active Players Initializer
Fetches and loads all active NBA players with detailed info from team rosters into PostgreSQL
"""

import psycopg2
from psycopg2.extras import execute_values
from typing import Dict, List
import logging
import time

# NBA API imports
try:
    from nba_api.stats.static import teams as nba_teams
    from nba_api.stats.endpoints import commonteamroster
    NBA_API_AVAILABLE = True
except ImportError:
    NBA_API_AVAILABLE = False
    print("❌ nba_api package not found. Please install with: pip install nba_api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class PlayerInitializer:
    """Initialize NBA active players from team rosters with detailed information"""
    
    def __init__(self, db_config: Dict[str, str]):
        """Initialize with database configuration"""
        if not NBA_API_AVAILABLE:
            raise ImportError("nba_api package is required. Install with: pip install nba_api")
            
        self.db_config = db_config
    
    def get_connection(self) -> psycopg2.extensions.connection:
        """Create database connection"""
        return psycopg2.connect(**self.db_config)
    
    def get_nba_teams(self) -> List[Dict]:
        """Get all NBA team IDs"""
        teams_data = nba_teams.get_teams()
        return teams_data
    
    def fetch_team_roster(self, team_id: str, season: str = '2024-25') -> List[Dict]:
        """Fetch roster for a specific team using CommonTeamRoster endpoint"""
        logger.info(f"  📋 Fetching roster for team {team_id}")
        
        try:
            # Add delay to avoid rate limiting
            time.sleep(0.5)
            
            roster = commonteamroster.CommonTeamRoster(
                team_id=team_id,
                season=season
            )
            
            # Get the roster data
            roster_data = roster.get_data_frames()[0]
            
            # Convert to list of dictionaries
            roster_list = roster_data.to_dict('records')
            
            logger.info(f"    Found {len(roster_list)} players for team {team_id}")
            return roster_list
            
        except Exception as e:
            logger.error(f"Error fetching roster for team {team_id}: {e}")
            return []
    
    def fetch_all_active_players(self, season: str = '2024-25') -> List[Dict]:
        """Fetch all active NBA players from team rosters"""
        logger.info("👤 Fetching all active NBA players from team rosters...")
        
        all_players = []
        teams = self.get_nba_teams()
        
        logger.info(f"Processing {len(teams)} NBA teams...")
        
        for i, team in enumerate(teams, 1):
            team_id = str(team['id'])
            team_name = team['full_name']
            
            logger.info(f"🏀 ({i}/{len(teams)}) Processing {team_name} (ID: {team_id})")
            
            roster = self.fetch_team_roster(team_id, season)
            
            for player in roster:
                # Add team info to player data
                player['TEAM_ID'] = team_id
                all_players.append(player)
        
        logger.info(f"✅ Found {len(all_players)} total active players")
        return all_players
    
    def parse_height_to_inches(self, height_str: str) -> int:
        """Convert height string like '6-1' to inches"""
        try:
            if not height_str or height_str == '':
                return 72  # Default 6'0"
            
            if '-' in height_str:
                feet, inches = height_str.split('-')
                return int(feet) * 12 + int(inches)
            else:
                return 72  # Default if format is unexpected
        except:
            return 72  # Default on any error
    
    def normalize_position(self, position: str) -> str:
        """
        Normalize NBA position names to fit database constraints (max 10 chars)
        """
        if not position or str(position) == 'nan':
            return 'G'
        
        # Clean up the position string
        position = str(position).strip()
        
        # Handle common long position names
        position_mapping = {
            'Forward-Center': 'F-C',
            'Center-Forward': 'C-F',
            'Guard-Forward': 'G-F',
            'Forward-Guard': 'F-G',
            'Point Guard': 'PG',
            'Shooting Guard': 'SG',
            'Small Forward': 'SF',
            'Power Forward': 'PF',
            'Center': 'C',
            'Forward': 'F',
            'Guard': 'G'
        }
        
        # Check if we have a mapping for this position
        if position in position_mapping:
            return position_mapping[position]
        
        # If no mapping found, truncate to 10 characters
        if len(position) > 10:
            # Try to intelligently truncate
            if '-' in position:
                # For hyphenated positions like "Forward-Center", take first letter of each part
                parts = position.split('-')
                return '-'.join([part[0] for part in parts if part])[:10]
            else:
                # Just truncate
                return position[:10]
        
        return position
    
    def parse_experience(self, exp_str) -> int:
        """Parse experience string to integer"""
        try:
            if not exp_str or exp_str == '' or str(exp_str).upper() == 'R':
                return 0  # Rookie
            return int(exp_str)
        except:
            return 0
    
    def clear_players_table(self):
        """Clear existing players data (and dependent data due to foreign key constraints)"""
        logger.info("🧹 Clearing existing players data...")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Delete in correct order to respect foreign keys
            logger.info("  - Clearing player game stats...")
            cursor.execute('DELETE FROM player_game_stats')
            
            logger.info("  - Clearing players...")
            cursor.execute('DELETE FROM players')
            
            conn.commit()
            cursor.close()
            
        logger.info("✅ Players table (and dependent data) cleared")
    
    def insert_players(self, players_data: List[Dict]):
        """Insert NBA players into database with detailed information"""
        logger.info("📊 Inserting NBA active players into database...")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            players_to_insert = []
            for player in players_data:
                player_id = str(player['PLAYER_ID'])
                full_name = player.get('PLAYER', 'Unknown Player')
                team_id = str(player.get('TEAM_ID', ''))
                
                # Parse height from "6-1" format to inches
                height_str = player.get('HEIGHT', '6-0')
                height_inches = self.parse_height_to_inches(height_str)
                
                # Parse weight
                weight_str = player.get('WEIGHT', '200')
                try:
                    weight_pounds = int(weight_str) if weight_str else 200
                except:
                    weight_pounds = 200
                
                # Parse age
                age = player.get('AGE')
                try:
                    age = int(age) if age else None
                except:
                    age = None
                
                # Get position and normalize it
                position = player.get('POSITION', 'G')
                position = self.normalize_position(position)
                
                # Parse experience
                exp_str = player.get('EXP', '0')
                years_experience = self.parse_experience(exp_str)
                
                players_to_insert.append((
                    player_id, full_name, team_id, age, position, 
                    height_inches, weight_pounds, years_experience
                ))
            
            # Batch insert all players
            execute_values(
                cursor,
                """INSERT INTO players (id, name, team_id, age, position, height_inches, weight_pounds, years_experience)
                   VALUES %s ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name,
                   team_id = EXCLUDED.team_id,
                   age = EXCLUDED.age,
                   position = EXCLUDED.position,
                   height_inches = EXCLUDED.height_inches,
                   weight_pounds = EXCLUDED.weight_pounds,
                   years_experience = EXCLUDED.years_experience,
                   updated_at = CURRENT_TIMESTAMP""",
                players_to_insert
            )
            
            conn.commit()
            cursor.close()
            
        logger.info(f"✅ Inserted {len(players_data)} active players with detailed information")
    
    def initialize_players(self, clear_existing: bool = True, season: str = '2024-25'):
        """Main method to initialize all active NBA players with detailed info"""
        logger.info("🚀 Starting NBA active players initialization...")
        
        try:
            if clear_existing:
                self.clear_players_table()
            
            # Fetch all players from team rosters
            players_data = self.fetch_all_active_players(season)
            
            if players_data:
                self.insert_players(players_data)
            else:
                logger.warning("No player data found!")
            
            logger.info("🎉 Active players initialization completed successfully!")
            
        except Exception as e:
            logger.error(f"Active players initialization failed: {e}")
            raise
    
    def get_player_count(self) -> int:
        """Get count of players in database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM players")
            count = cursor.fetchone()[0]
            cursor.close()
            return count
    
    def get_player_summary(self) -> Dict:
        """Get summary statistics of players in database"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Count by team
            cursor.execute("""
                SELECT t.team_name, COUNT(p.id) as player_count
                FROM players p
                JOIN teams t ON p.team_id = t.id
                GROUP BY t.team_name
                ORDER BY player_count DESC
            """)
            team_counts = cursor.fetchall()
            
            # Count by position
            cursor.execute("""
                SELECT position, COUNT(*) as count
                FROM players
                GROUP BY position
                ORDER BY count DESC
            """)
            position_counts = cursor.fetchall()
            
            cursor.close()
            
            return {
                'team_counts': team_counts,
                'position_counts': position_counts
            }

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
    
    # Initialize active players
    initializer = PlayerInitializer(db_config)
    initializer.initialize_players()
    
    # Show final count and summary
    count = initializer.get_player_count()
    print(f"📊 Total active players in database: {count}")
    
    summary = initializer.get_player_summary()
    print(f"\n🏀 Players by team (top 5):")
    for team_name, player_count in summary['team_counts'][:5]:
        print(f"  {team_name}: {player_count} players")
    
    print(f"\n👤 Players by position:")
    for position, count in summary['position_counts']:
        print(f"  {position}: {count} players")

if __name__ == "__main__":
    main()