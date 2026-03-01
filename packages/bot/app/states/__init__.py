"""
FSM states for the submission wizard and onboarding flow.
"""
from aiogram.fsm.state import State, StatesGroup


class SubmitStates(StatesGroup):
    waiting_for_product = State()   # User is browsing/searching product list
    waiting_for_search = State()    # User typed a search query
    waiting_for_order = State()     # Product selected, waiting for order number
    waiting_for_photos = State()    # Order number entered, waiting for screenshots
    waiting_for_confirm = State()   # Photos collected, confirming before upload


class OnboardingStates(StatesGroup):
    step_language = State()   # Step 1: language selection
    step_explain = State()    # Step 2: how-it-works explainer (auto-advance)
    step_product = State()    # Step 3: pick a product to review
    step_order = State()      # Step 4: enter order number
    step_done = State()       # Step 5: completion CTA
