#!/usr/bin/env python3
"""
NBA Data Pipeline - Main Orchestrator
Coordinates team initialization, player initialization, and data extraction
"""

import sys
from datetime import date, datetime
import logging
from typing import Dict

from initialize_teams import TeamInitializer
from initialize_active_players import PlayerInitializer
from extract_nba_data import NBADataExtractor
from extract_nba_advanced_stats import NBAAdvancedStatsExtractor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class NBADataPipeline:
    """Main NBA Data Pipeline orchestrator"""
    
    def __init__(self, db_config: Dict[str, str]):
        """Initialize pipeline with database configuration"""
        self.db_config = db_config
        self.team_initializer = TeamInitializer(db_config)
        self.player_initializer = PlayerInitializer(db_config)
        self.data_extractor = NBADataExtractor(db_config)
        self.advanced_extractor = NBAAdvancedStatsExtractor(db_config)
    
    def clear_all_data(self):
        """Clear all data from database in correct order"""
        logger.info("🧹 Clearing all data from database...")
        
        import psycopg2
        with psycopg2.connect(**self.db_config) as conn:
            cursor = conn.cursor()
            
            # Delete in correct order to respect foreign keys
            logger.info("  - Clearing player advanced stats...")
            cursor.execute('DELETE FROM player_advanced_stats')
            
            logger.info("  - Clearing team advanced stats...")
            cursor.execute('DELETE FROM team_advanced_stats')
            
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
            
        logger.info("✅ All data cleared successfully")
    
    def setup_teams(self, clear_existing: bool = True):
        """Initialize NBA teams"""
        logger.info("🏀 Setting up NBA teams...")
        if clear_existing:
            # Don't clear teams table directly, clear all data to avoid foreign key issues
            self.clear_all_data()
        self.team_initializer.initialize_teams(clear_existing=False)
        logger.info("✅ Teams setup completed")
    
    def setup_players(self, clear_existing: bool = True):
        """Initialize active NBA players"""
        logger.info("👤 Setting up NBA active players...")
        if clear_existing:
            self.player_initializer.initialize_players(clear_existing=True)
        else:
            self.player_initializer.initialize_players(clear_existing=False)
        logger.info("✅ Players setup completed")
    
    def setup(self):
        """Initialize both teams and players"""
        logger.info("🚀 Setting up complete NBA database...")
        # Clear all data once, then setup teams and players without additional clearing
        self.clear_all_data()
        self.team_initializer.initialize_teams(clear_existing=False)
        self.player_initializer.initialize_players(clear_existing=False)
        logger.info("🎉 Complete setup finished!")
    
    def load_date(self, target_date: date, load_advanced: bool = True):
        """Load games and stats for a specific date"""
        logger.info(f"📅 Loading games for {target_date}")
        
        # First load traditional stats (games, players, teams)
        logger.info("📊 Loading traditional stats...")
        self.data_extractor.extract_games_for_date(target_date)
        
        # Then load advanced stats if requested
        if load_advanced:
            logger.info("📈 Loading advanced stats...")
            try:
                self.advanced_extractor.extract_advanced_stats_for_date(target_date)
                logger.info(f"🎉 Successfully loaded both traditional and advanced stats for {target_date}")
            except Exception as e:
                logger.error(f"❌ Failed to load advanced stats for {target_date}: {e}")
                logger.info("✅ Traditional stats were loaded successfully")
        else:
            logger.info(f"✅ Successfully loaded traditional stats for {target_date}")
    
    def load_date_range(self, start_date: date, end_date: date, load_advanced: bool = True):
        """Load games and stats for a date range"""
        logger.info(f"📅 Loading games from {start_date} to {end_date}")
        
        # First load traditional stats for the entire range
        logger.info("📊 Loading traditional stats for date range...")
        self.data_extractor.extract_games_for_date_range(start_date, end_date)
        
        # Then load advanced stats if requested
        if load_advanced:
            logger.info("📈 Loading advanced stats for date range...")
            try:
                self.advanced_extractor.extract_advanced_stats_for_date_range(start_date, end_date)
                logger.info(f"🎉 Successfully loaded both traditional and advanced stats for {start_date} to {end_date}")
            except Exception as e:
                logger.error(f"❌ Failed to load advanced stats for date range: {e}")
                logger.info("✅ Traditional stats were loaded successfully")
        else:
            logger.info(f"✅ Successfully loaded traditional stats for {start_date} to {end_date}")
    
    def load_advanced_only_date(self, target_date: date):
        """Load only advanced stats for a specific date (assumes traditional stats already exist)"""
        logger.info(f"📈 Loading advanced stats only for {target_date}")
        self.advanced_extractor.extract_advanced_stats_for_date(target_date)
    
    def load_advanced_only_date_range(self, start_date: date, end_date: date):
        """Load only advanced stats for a date range (assumes traditional stats already exist)"""
        logger.info(f"📈 Loading advanced stats only from {start_date} to {end_date}")
        self.advanced_extractor.extract_advanced_stats_for_date_range(start_date, end_date)

def get_db_config() -> Dict[str, str]:
    """Get database configuration"""
    return {
        'host': 'localhost',
        'database': 'nba_analytics',
        'user': 'nba_user',
        'password': 'your_password',
        'port': 5432
    }

def parse_date(date_str: str) -> date:
    """Parse date string in YYYY-MM-DD format"""
    try:
        year, month, day = date_str.split('-')
        return date(int(year), int(month), int(day))
    except ValueError:
        raise ValueError(f"Invalid date format: {date_str}. Use YYYY-MM-DD")

def print_usage():
    """Print usage instructions"""
    print("""
NBA Data Pipeline Usage:

Database Commands:
  python nba_pipeline.py clear           # Clear all data from database
  python nba_pipeline.py setup           # Initialize both teams and players (clears existing data)

Setup Commands:
  python nba_pipeline.py setup-teams     # Initialize NBA teams only (clears all data first)
  python nba_pipeline.py setup-players   # Initialize active players only  

Load Commands (Traditional + Advanced Stats):
  python nba_pipeline.py load 2025-01-15                    # Load all stats for specific date
  python nba_pipeline.py load 2025-01-15 to 2025-01-22     # Load all stats for date range

Load Commands (Traditional Stats Only):
  python nba_pipeline.py load-basic 2025-01-15                    # Load traditional stats only
  python nba_pipeline.py load-basic 2025-01-15 to 2025-01-22     # Load traditional stats only

Load Commands (Advanced Stats Only):
  python nba_pipeline.py load-advanced 2025-01-15                    # Load advanced stats only
  python nba_pipeline.py load-advanced 2025-01-15 to 2025-01-22     # Load advanced stats only

Examples:
  python nba_pipeline.py setup                              # Full setup
  python nba_pipeline.py load 2025-01-19                    # Load all stats for one day
  python nba_pipeline.py load 2025-01-15 to 2025-01-22     # Load all stats for date range
  python nba_pipeline.py load-basic 2025-01-19             # Load only traditional stats
  python nba_pipeline.py load-advanced 2025-01-19          # Load only advanced stats
    """)

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)
    
    command = sys.argv[1]
    
    # Initialize pipeline
    db_config = get_db_config()
    pipeline = NBADataPipeline(db_config)
    
    try:
        if command == "clear":
            # Clear all data
            pipeline.clear_all_data()
            
        elif command == "setup":
            # Full setup: teams + players
            pipeline.setup()
            
        elif command == "setup-teams":
            # Setup teams only
            pipeline.setup_teams()
            
        elif command == "setup-players":
            # Setup players only
            pipeline.setup_players()
            
        elif command in ["load", "load-basic", "load-advanced"]:
            # Determine what to load
            load_traditional = command in ["load", "load-basic"]
            load_advanced_stats = command in ["load", "load-advanced"]
            advanced_only = command == "load-advanced"
            
            # Load games
            if len(sys.argv) < 3:
                print("Please provide a date or date range")
                print("Examples:")
                print(f"  python nba_pipeline.py {command} 2025-01-15")
                print(f"  python nba_pipeline.py {command} 2025-01-15 to 2025-01-22")
                sys.exit(1)
            
            # Check if it's a date range
            if len(sys.argv) >= 5 and sys.argv[3] == "to":
                # Date range: load 2025-01-15 to 2025-01-22
                start_date_str = sys.argv[2]
                end_date_str = sys.argv[4]
                
                try:
                    start_date = parse_date(start_date_str)
                    end_date = parse_date(end_date_str)
                    
                    if start_date > end_date:
                        print("Start date must be before or equal to end date")
                        sys.exit(1)
                    
                    if advanced_only:
                        pipeline.load_advanced_only_date_range(start_date, end_date)
                    elif load_traditional:
                        pipeline.load_date_range(start_date, end_date, load_advanced=load_advanced_stats)
                    
                except ValueError as e:
                    print(f"Error: {e}")
                    sys.exit(1)
            
            else:
                # Single date: load 2025-01-15
                date_str = sys.argv[2]
                
                try:
                    target_date = parse_date(date_str)
                    
                    if advanced_only:
                        pipeline.load_advanced_only_date(target_date)
                    elif load_traditional:
                        pipeline.load_date(target_date, load_advanced=load_advanced_stats)
                    
                except ValueError as e:
                    print(f"Error: {e}")
                    sys.exit(1)
        
        else:
            print(f"Unknown command: {command}")
            print_usage()
            sys.exit(1)
    
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()