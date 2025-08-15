#!/usr/bin/env python3
"""
NBA API Field Debugger - Check what fields are actually returned
"""

from nba_api.stats.endpoints import boxscoretraditionalv2
import json
from datetime import date

def debug_nba_api_fields(game_id: str):
    """Debug what fields the NBA API actually returns"""
    print(f"🔍 Debugging NBA API fields for game: {game_id}")
    
    try:
        # Fetch boxscore data
        boxscore = boxscoretraditionalv2.BoxScoreTraditionalV2(game_id=game_id)
        boxscore_dict = boxscore.get_dict()
        
        # Check all result sets
        for result_set in boxscore_dict['resultSets']:
            print(f"\n📊 ResultSet: {result_set['name']}")
            print(f"Headers: {result_set['headers']}")
            
            if result_set['name'] == 'TeamStats':
                print("\n🏀 TEAM STATS HEADERS:")
                for i, header in enumerate(result_set['headers']):
                    print(f"  {i:2d}: {header}")
                
                # Show first row of data
                if result_set['rowSet']:
                    print(f"\n📈 First team data row:")
                    first_row = result_set['rowSet'][0]
                    for i, (header, value) in enumerate(zip(result_set['headers'], first_row)):
                        print(f"  {header}: {value}")
            
            elif result_set['name'] == 'PlayerStats':
                print("\n👤 PLAYER STATS HEADERS:")
                for i, header in enumerate(result_set['headers']):
                    print(f"  {i:2d}: {header}")
                
                # Show first player with minutes > 0
                if result_set['rowSet']:
                    for row in result_set['rowSet']:
                        player_dict = dict(zip(result_set['headers'], row))
                        if player_dict.get('MIN') and player_dict['MIN'] != '0:00':
                            print(f"\n📈 Sample player data ({player_dict.get('PLAYER_NAME', 'Unknown')}):")
                            for header, value in player_dict.items():
                                if 'TOV' in header or 'TURNOVER' in header.upper():
                                    print(f"  🔴 {header}: {value}")
                                else:
                                    print(f"  {header}: {value}")
                            break
                            
    except Exception as e:
        print(f"❌ Error: {e}")

def check_recent_game():
    """Find a recent completed game to debug"""
    from nba_api.stats.endpoints import scoreboardv2
    import time
    
    # Try last few days to find a completed game
    for days_back in range(1, 8):
        check_date = date.today()
        # Subtract days (simple approximation)
        if days_back > 0:
            import datetime
            check_date = date.today() - datetime.timedelta(days=days_back)
        
        date_str = check_date.strftime('%m/%d/%Y')
        print(f"🗓️  Checking {date_str}...")
        
        try:
            scoreboard = scoreboardv2.ScoreboardV2(game_date=date_str)
            scoreboard_dict = scoreboard.get_dict()
            
            # Find completed games
            for result_set in scoreboard_dict['resultSets']:
                if result_set['name'] == 'GameHeader':
                    headers = result_set['headers']
                    for row in result_set['rowSet']:
                        game_dict = dict(zip(headers, row))
                        if game_dict.get('GAME_STATUS_ID') == 3:  # Completed
                            game_id = game_dict['GAME_ID']
                            print(f"✅ Found completed game: {game_id}")
                            return game_id
            
            time.sleep(1)  # Rate limiting
            
        except Exception as e:
            print(f"❌ Error checking {date_str}: {e}")
            continue
    
    return None

if __name__ == "__main__":
    # Option 1: Use a specific game ID if you have one
    specific_game_id = "0022300584"  # Example game ID
    
    # Option 2: Find a recent game automatically
    print("🔍 Finding recent completed game...")
    recent_game_id = check_recent_game()
    
    if recent_game_id:
        debug_nba_api_fields(recent_game_id)
    else:
        print("⚠️  No recent completed games found, using example game ID")
        debug_nba_api_fields(specific_game_id)
