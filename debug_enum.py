import sys
import os
sys.path.append('/app')
import enum
from sqlalchemy import Enum as SAEnum
from sqlalchemy.sql.sqltypes import Enum

class AchievementRarity(str, enum.Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"

print(f"Member value: {AchievementRarity.COMMON.value}")
print(f"Member string: {str(AchievementRarity.COMMON)}")
print(f"Is instance of str: {isinstance(AchievementRarity.COMMON, str)}")

try:
    val = AchievementRarity("common")
    print(f"Lookup by value 'common' succeeded: {val}")
except ValueError as e:
    print(f"Lookup by value 'common' failed: {e}")

# Simulate SQLAlchemy logic?
# The error comes from sqlalchemy/sql/sqltypes.py
