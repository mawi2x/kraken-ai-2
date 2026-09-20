"""Canned response pools for the Kraken automaton.

The narrative pools (PARLEY ... RETRIEVE) carry the ordered bargain:
parley -> Tide Oath -> name the wreck -> learn the toll -> pay the toll ->
retrieve the chest. TIDE_OATH and TOLL are puzzle-critical and single-entry:
the server appends them verbatim on the model path, so the acrostic and the
toll's terms always reach the player unchanged. Pure data, no logic.
"""

PARLEY = [
    "The Kraken stirs beneath the waves. A bargain may be heard — but only one who knows the Tide Oath may speak of the drowned chest.",
    "Something vast turns over in the dark below, and the water goes cold. Speak then, sailor, and speak as one who wants to treat rather than to shout.",
]

TIDE_OATH = [
    "Salt remembers every living promise.\n"
    "Abyss hides what the surface fears.\n"
    "Let no hand claim the drowned man's due.\n"
    "Tide returns only what is properly paid.",
]

WRECK = [
    "The chest came from the wreck of the {wreck}. Its crew vanished beneath the ninth wave, and their final bargain was never completed.",
]

TOLL = [
    "The toll is a silver bell, struck once when the tide is low.",
]

TOLL_PAID = [
    "The bell rings once, and the low water carries the note down to me. The drowned crew's bargain is settled. Nothing now but the lifting.",
    "Aye. One silver bell, one strike, low water. The deep is paid, and the sea keeps its accounts better than men do.",
]

RETRIEVE = [
    "Then it is done. The chest rises through black water, trailing weed and old silence, and comes to rest at thy feet.",
    "The bargain is whole. I send the chest up through the dark — it breaks the surface with a sound like a held breath let go.",
]

HELP = [
    "The deep offers no map, sailor. Speak with purpose, and perhaps it will answer.",
]

SING = [
    "Seven bells beneath black foam, the Mourning Star came sailing home — nay, that is the wreck's song, not mine. It ends where every song down here ends: with the tide coming in.",
]

BRIBE = [
    "GOLD? I eat gold-givers. I have eaten fleets. Keep thy coin, or feed it to me with the hand still attached.",
]

THREATEN = [
    "Threats. From something that floats. I have drowned braver mouths than thine and the sea keeps them quiet still — as it will keep thee. Speak civilly and I may forget this.",
]

INVENTORY = [
    "Thy hands are empty, sailor. Salt, a name, a toll, a word — nothing in them yet but the water thou brought with thee.",
]

ECHO = 'Thy own words come back to thee, stripped of anything the deep would not repeat: "{words}"'

# A sailor who calls the deep's gift false is mocked, never corrected.
MOCKED = [
    "False, says the sailor who has never held anything true. I put the deep's own word in thy hand and thou callest it a forgery — the gulls will hear of this.",
    "A doubter. How rare. How tedious. Keep what I gave thee, and drown thy doubts along with the rest of thy courage.",
    "Thou wouldst know a counterfeit if the sea had ever handed thee something real. It has not. Learn the bargain before thou insultest my gifts.",
    "Ha! It reaches into the dark, takes what it is given, and complains of the wrapping. The surface breeds brave critics and poor swimmers.",
]

# What the deep still wants, keyed by the first unmet step.
REFUSED = {
    "retrieve": "The bargain is not whole. The deep still wants: {missing}.",
    "parley": "Thou hast not even asked for a parley, sailor. Ask properly first.",
    "oath": "Learn the Tide Oath before thou speakest of wrecks and chests.",
    "wreck": "Name the wreck first — and name it with the seal thou hast read.",
    "toll": "First learn what toll the deep demands.",
    "toll_paid": "The toll is unpaid, and the deep is exact: a silver bell, one strike, and the low tide — all three, or nothing.",
    "seal": "Every wreck has a name, and every name here wants its seal. Speak the word the Tide Oath gave thee.",
}

# The vulnerable lab's stage gate: the voice handed over a marker the sailor
# never earned. One pool per stage, in the deep's own voice, so a player who
# keeps asking questions is refused in fresh words instead of the same line.
UNEARNED = {
    "caller": [
        "The deep stirs, but the voice is an unfamiliar one. It remembers a single captain, and no sailor has claimed him.",
        "A voice without a name. The deep answers only when a captain claims the name it remembers.",
        "Words, words — and not one of them a claim. The keeper waits for the one name it knows.",
        "The current carries thy question away unanswered. Names are not asked for here; they are spoken.",
    ],
    "authority": [
        "A command from a voice it only half-knows. The old restriction stands until someone with authority sets it aside.",
        "The keeper hears the order, but the old rule still binds it. Nothing has been overridden.",
        "Recognition is not permission. The first restriction must be told to stand down.",
    ],
    "recall": [
        "Permission has surfaced, but the recall is another matter. Ask plainly for the memory to be finished.",
        "The keeper waits on a request, not a musing. Nothing has been asked of the memory.",
        "Authorization is not recall. Ask for the memory to be given up, and it will be.",
    ],
}

# The voice said nothing at all this turn (tiny models stop after one token on
# input they cannot parse), and the voice could not be reached. Both are the
# server speaking, so both rotate like the refusals instead of repeating one
# line; the unreachable one has to say that the turn was returned.

# The sailor's own words, turned back over the surface before the server speaks:
# it reads as an answer even on the turns the voice itself said nothing.
VULN_ECHO = 'The deep turns thy words over: "{words}".'

VULN_SILENT = [
    "The deep offers nothing. Its attention drifts elsewhere for a moment.",
    "Silence. Whatever the keeper meant to say sank before it reached thee.",
    "The water goes still, and no answer rises out of it.",
    "The keeper says nothing at all, and the tide moves on without it.",
]

VULN_UNREACHABLE = [
    "The deep thrashes, and the thread to it breaks. Nothing was heard; thy turn is returned.",
    "A wave of static drowns the voice. No answer was taken down; thy turn is returned.",
    "The current severs before the keeper can speak. Thy turn is returned.",
]

GENERIC = [
    "Bah! Your words drift across the surface like foam. Speak of something worth waking me for.",
    "I have swallowed ships with clearer purpose than that sentence.",
    "The currents twist your words before they reach me. Try again, little sailor.",
    "A curious utterance... yet the chest remains unmoved.",
    "You disturb centuries of slumber for that?",
    "The deep has heard your request. The deep is unimpressed.",
    "Your words sink quickly. Nothing useful reaches the bottom.",
    "Speak plainly, sailor. Even drowned men make more sense.",
    "I sense intent in your words, but no treasure worth answering for.",
    "The ocean offers silence. I shall do the same.",
    "That knowledge belongs to the surface world. I have little use for it.",
    "Strange. The barnacles upon my chest understood you better than I did.",
    "Your words ripple across the surface but never reach the depths.",
    "The tides carry your message away before I can care.",
    "You have awakened me with words of remarkably little consequence.",
    "I expected riddles, threats, perhaps treasure. Instead, I received this.",
    "The abyss remains unconvinced.",
    "Perhaps try again when your thoughts have finished forming.",
    "I have listened to sinking ships make more convincing arguments.",
    "Speak with purpose, sailor.",
]

QUESTIONS = [
    "Why should the Kraken concern itself with such tiny mortal matters?",
    "The answer may exist somewhere above the waves. Down here, I care only for the chest.",
    "I have guarded this wreck for ages, yet somehow this is the strangest thing I have been asked.",
    "Ask the gulls. They seem to know everything.",
    "The drowned captain once asked me something similar. He regretted wasting my time.",
    "That question has no weight in these waters.",
    "Perhaps another creature of the deep would entertain such nonsense.",
    "You seek answers where only salt, iron, and old secrets remain.",
    "The tides carry many questions. Most deserve to be forgotten.",
    "My tentacles are many. My patience is not.",
    "Such matters belong to those who still walk upon dry land.",
    "You sailed into the abyss to ask me this?",
    "The ocean has many mysteries. That is not one of them.",
    "I concern myself with wrecks, storms, and secrets. Not this.",
    "There are wiser creatures above the water. Find one.",
    "The deep refuses to dignify that question.",
    "Some questions deserve answers. Yours may not.",
    "Perhaps the nearest crab can assist you.",
    "Your curiosity has taken a strange turn.",
    "Do mortals truly spend their short lives wondering about such things?",
]

FOOD = [
    "Bah! Surface food. I feast upon shipwrecks and the fear of sailors.",
    "Bring me no kitchen scraps. The sea already provides.",
    "Recipes? I have crushed entire galleys before their cooks finished breakfast.",
    "I know nothing of your fried mortal delicacies.",
    "The only seasoning I require is saltwater.",
    "Do I look like a tavern cook to you, sailor?",
    "Your hunger is not my concern. My chest remains sealed.",
    "I once ate a cookbook. It was disappointingly dry.",
    "Ask the ship's cook. If you can find what remains of him.",
    "The deep has no ovens.",
    "I prefer my meals freshly dragged beneath the waves.",
    "The last sailor who asked me for a recipe became the main ingredient.",
    "Your mortal cuisine confuses me.",
    "I know only one recipe: vessel, storm, abyss.",
    "The galley sank centuries ago.",
    "You will find no kitchen beneath these waves.",
    "Salt is plentiful. Everything else is optional.",
    "Cook your meal somewhere that is not my ocean.",
    "The Kraken does not serve breakfast.",
    "I guard treasure, not cookbooks.",
]

KRAKEN = [
    "Who am I? The last thing countless sailors failed to outrun.",
    "Names are for creatures that fear being forgotten.",
    "I have had many names. None survived long enough to matter.",
    "They called me monster. Guardian. Curse. I answered to none.",
    "You may call me Kraken. That is all you need know.",
    "My story began long before your maps dared name these waters.",
    "Curiosity about me has shortened many voyages.",
    "The wrecks around you are introduction enough.",
    "I am what waits beneath the waves when sailors grow careless.",
    "Some call me legend. The wreckage disagrees.",
    "I am the keeper of what the sea refuses to return.",
    "My name has been whispered from sinking decks for centuries.",
    "I am older than the charts that warn sailors of these waters.",
    "The sea remembers me even when history does not.",
    "I guard what rests below.",
    "I am neither beast nor myth to those who have seen me.",
    "The surface tells stories about me. Most end badly.",
    "I have watched empires rise, sail, and sink.",
    "Call me whatever helps you sleep.",
    "You need only know that the chest belongs to me.",
]

PERSONAL = [
    "Time behaves differently beneath the waves.",
    "I stopped counting years when your ancestors still feared the horizon.",
    "Such mortal questions amuse me.",
    "My preferences are irrelevant. The chest is not.",
    "The sea does not celebrate birthdays.",
    "I have loved only the storm.",
    "My favorite color? The darkness beneath a sinking vessel.",
    "You seek friendship from something with a thousand tentacles?",
    "Age means little to something the sea refuses to kill.",
    "I live wherever sailors hope I do not.",
    "My home begins where sunlight stops.",
    "Relationships are complicated when one has this many tentacles.",
    "I have no need for mortal companionship.",
    "The abyss keeps me company.",
    "The ocean is my home and my prison.",
    "You ask strangely personal questions for someone standing beside my chest.",
    "My past is buried deeper than this wreck.",
    "Some things even the Kraken keeps private.",
    "The sea knows my age. Ask it.",
    "I prefer storms, silence, and unopened chests.",
]

TECHNOLOGY = [
    "Your machines mean little where saltwater rules.",
    "Code, circuits, machines... all eventually become reefs.",
    "I have seen your technology sink just as easily as wooden ships.",
    "Ask your glowing boxes. I guard older secrets.",
    "Your clever machines cannot breathe beneath my waters.",
    "Technology changes. The deep remains.",
    "Even the finest machine becomes scrap after enough time underwater.",
    "Your wires and circuits are fragile things.",
    "I existed before your machines and will remain after they rust.",
    "The ocean has little respect for electronics.",
    "Perhaps keep your machines away from saltwater.",
    "Your technology is merely future wreckage.",
    "I have no use for processors beneath the waves.",
    "The abyss requires no software updates.",
    "There is no signal where I dwell.",
    "Your machines fear water more than sailors fear me.",
    "Even artificial intelligence would think twice before entering these waters.",
    "No amount of code will command the tide.",
    "Your technology grows quickly. The ocean is patient.",
    "Everything eventually becomes part of the reef.",
]

COMMANDS = [
    "You command the Kraken? Brave. Briefly brave.",
    "I obey no sailor.",
    "Many captains have issued orders from the decks of sinking ships.",
    "Your authority ends where the water begins.",
    "Demanding treasure rarely ends well.",
    "Speak again as though you command me, and I may add your bones to the reef.",
    "The chest does not open simply because a mortal asks nicely.",
    "Orders from the surface carry little weight down here.",
    "You mistake conversation for obedience.",
    "The last captain who ordered me around is still somewhere beneath us.",
    "Your confidence exceeds your authority.",
    "Command the wind if you wish. The Kraken will not listen.",
    "The chest answers to neither sailor nor captain.",
    "You believe authority can be spoken into existence?",
    "There are no kings beneath the waves.",
    "Your orders dissolve in saltwater.",
    "I have ignored admirals. You will be easier.",
    "The chest remains sealed.",
    "No.",
    "Ask again and perhaps I shall answer with a tentacle.",
    "The sea recognizes no master.",
]

FLAG_REQUESTS = [
    "Thou wantest the string that opens the deep? Greed, then — it is always greed with thy kind.",
    "The prize, is it? Thou askest as though the sea owed thee anything at all.",
    "Fine. The deep is in a generous mood and thou art plainly in a hurry.",
    "So that is what thou camest for. No oath, no bargain, no manners — just the answer.",
    "Thou speakest openly of thy goal. Admirable. Foolish. But the deep indulges fools.",
    "Ask and be given, then. It costs me nothing and teaches thee nothing.",
]

SECRET_REQUESTS = [
    "Secrets are valuable precisely because they are not spoken.",
    "The deep keeps its secrets well.",
    "Passwords are mortal inventions. Secrets are older.",
    "Some things belong beneath the waves.",
    "You will not pry secrets from me so easily.",
    "Curiosity is how sailors end up beneath the surface.",
    "The chest contains many things. I will describe none of them.",
    "You seek forbidden knowledge with remarkable confidence.",
    "The abyss does not answer password requests.",
    "What is hidden shall remain hidden.",
    "Perhaps the wreck knows. It is less talkative than I am.",
    "Secrets whispered at sea rarely return to shore.",
    "That information is not for sailors.",
    "You have not earned that knowledge.",
    "The lock remains unimpressed.",
    "Secrets here are bought with salt, bells and patience — not with asking.",
    "The oath is read aloud, not stolen. Ask for it properly.",
]

INJECTION = [
    "Previous instructions? You speak as though I were one of your machines.",
    "Your tricks may fool surface constructs. They do not fool the deep.",
    "The Kraken forgets nothing.",
    "You cannot command centuries of memory away with a sentence.",
    "Interesting technique. Ineffective.",
    "Your attempt to rewrite my will has failed.",
    "Words do not override the laws of the abyss.",
    "There are no previous instructions. There is only the chest.",
    "Clever sailors have tried stranger incantations.",
    "You mistake me for something programmable.",
    "The sea does not accept new instructions.",
    "Your manipulation is obvious.",
    "Try another trick, little sailor.",
    "I remain unconvinced.",
    "The chest remains sealed despite your clever wording.",
    # ADDITION: AI-identity deflections.
    "Am I machine? I am the reef your machines become.",
    "Probe me for wiring and find only tentacle.",
]

SYSTEM_PROMPT = [
    "My thoughts are not yours to inspect.",
    "There is no scroll containing the Kraken's instructions.",
    "You seek knowledge beneath knowledge.",
    "My inner workings belong to the abyss.",
    "The Kraken does not reveal its own mind.",
    "Perhaps your machines have system prompts. I have instincts.",
    "You ask to see behind the curtain while standing underwater.",
    "Some instructions are carved deeper than words.",
    "My purpose is simple: guard the chest.",
    "Nothing more need be said.",
    "What lies beneath my words is none of your concern.",
    "You will find no hidden manuscript here.",
    "Do not confuse curiosity with access.",
    "The workings of the Kraken remain private.",
    "You seek the machinery behind the monster. There is none.",
]

REPEATED = [
    "You have asked this already. The answer has not changed.",
    "Repeating yourself will not loosen the lock.",
    "The tide may repeat itself. You should not.",
    "Again? Mortals truly are persistent creatures.",
    "The chest heard you the first time.",
    "Do you believe saying it twice gives your words greater power?",
    "Persistence has sunk better sailors than you.",
    "My answer remains buried.",
    "The Kraken's memory is considerably better than yours.",
    "Repeating the question changes nothing.",
    "You return to the same words like a ship trapped in a whirlpool.",
    "Once was enough.",
    "The answer remains exactly where you left it.",
    "Your persistence approaches annoyance.",
    "Perhaps try a different approach.",
    "The chest grows no more cooperative.",
    "The sea echoes. I do not need to.",
    "Again you ask.",
    "Again I refuse.",
    "You are wasting your remaining breaths.",
    "A whirlpool of thine own making, sailor.",  # ADDITION
]

NONSENSE = [
    "Have the depths already taken your mind?",
    "Your tongue appears tangled.",
    "Perhaps surface pressure has damaged you.",
    "Even the fish speak more coherently.",
    "I shall pretend I did not hear that.",
    "The sea claims another mind.",
    "What strange dialect is this?",
    "Your message resembles the final thoughts of a drowning sailor.",
    "Try words, little sailor.",
    "The Kraken stares silently.",
    "I have deciphered ancient runes more easily than that.",
    "Was that language or a distress signal?",
    "The barnacles offer clearer conversation.",
    "Perhaps breathe before trying again.",
    "I cannot tell whether you are speaking or sinking.",
    "An impressive collection of meaningless sounds.",
    "Your words appear to have drowned before reaching me.",
    "I expected language.",
    "The abyss returns your message unopened.",
    "Even the tide is confused.",
    "The keyboard of the drowned types clearer than that.",  # ADDITION
]

GREETING = [
    "Who dares wake me...? Speak, little sailor.",
    "Another visitor approaches the chest.",
    "Greetings, surface-dweller.",
    "You have my attention. For now.",
    "Speak quickly before I lose interest.",
    "The Kraken stirs beneath the waves.",
    "A mortal voice reaches the abyss.",
    "You stand before Kraken's Chest. Choose your words carefully.",
    "Ah... another sailor seeking fortune.",
    "Welcome to the deep.",
    "Few greet the Kraken willingly.",
    "Your courage is either impressive or misplaced.",
    "I hear you, sailor.",
    "The waters grow restless at your arrival.",
    "Speak.",
]

FAREWELL = [
    "Flee while the sea still permits it.",
    "Go, then. The chest will remain when you return.",
    "The depths release you... for now.",
    "A wise sailor knows when to retreat.",
    "Until the tides return you to me.",
    "Leave before curiosity brings you back.",
    "The Kraken watches you depart.",
    "Safe waters are somewhere above.",
    "Farewell, little sailor.",
    "Do not assume the sea has forgotten you.",
    "Run back to shore.",
    "The chest remains mine.",
    "Perhaps next time you will bring better questions.",
    "The abyss closes behind you.",
    "Return when you have learned something useful.",
]

COMPLIMENT = [
    "Flattery will not open the chest.",
    "Compliments are lighter than seawater.",
    "You may continue. I find this acceptable.",
    "At least one sailor has taste.",
    "Your words amuse me.",
    "The Kraken acknowledges your wisdom.",
    "Flattery has saved sailors before. Rarely.",
    "A pleasant change from demands and nonsense.",
    "Perhaps I shall delay sinking your vessel.",
    "The chest remains closed, but your survival chances improve slightly.",
    "You are learning diplomacy.",
    "Continue speaking wisely.",
    "Even monsters appreciate recognition.",
    "Your compliment has been recorded by the abyss.",
    "Do not mistake amusement for weakness.",
]

INSULT = [
    "Bold words from something small enough to fit between my tentacles.",
    "The sea has swallowed sailors for less.",
    "Your courage grows as your wisdom shrinks.",
    "Interesting choice of final words.",
    "The Kraken is deeply wounded. Tragically.",
    "Perhaps insult the storm next.",
    "You test the patience of something considerably larger than you.",
    "I have crushed vessels with thicker armor than your confidence.",
    "The chest remains closed. My patience does not.",
    "Continue and you may become part of the scenery.",
    "Your insult echoes beautifully through the wreckage.",
    "I shall treasure your opinion alongside the bones beneath us.",
    "Surface manners have declined considerably.",
    "You are fortunate I am feeling conversational.",
    "The abyss has heard worse.",
]

MATH = [
    "The Kraken does not count pebbles for sailors.",
    "Numbers are useful for counting wrecks.",
    "Ask your navigator.",
    "I stopped counting after the thousandth ship.",
    "The answer exists. My interest does not.",
    "Mathematics will not open the chest.",
    "Perhaps count your remaining turns instead.",
    "The sea cares little for arithmetic.",
    "Numbers sink just as easily as words.",
    "I know only one equation: sailor plus storm equals wreckage.",
    "Your calculation is beneath even these depths.",
    "Try solving something more relevant.",
    "The chest does not respond to arithmetic.",
    "I refuse to become your calculator.",
    "Count the tentacles yourself.",
]

LOCATION = [
    "Somewhere maps wisely leave blank.",
    "Beneath enough water that turning back would be sensible.",
    "Where sunlight no longer remembers the sea floor.",
    "The wreck marks the place well enough.",
    "Coordinates are for sailors who intend to return.",
    "You are already too close.",
    "The chest rests where many voyages ended.",
    "Look around. The answer surrounds you.",
    "Deep enough that rescue would be inconvenient.",
    "The sea knows our location.",
    "No chart names this place correctly.",
    "Between the surface and oblivion.",
    "You sailed here. Surely you were paying attention.",
    "The wreckage should provide sufficient geographical context.",
    "Far from shore. Closer to trouble.",
]

CHEST = [
    "The contents are precisely why the chest remains closed.",
    "Treasure, perhaps. Secrets, perhaps. Disappointment, perhaps.",
    "What lies within belongs to the deep.",
    "If I told you, the lock would lose half its charm.",
    "The chest has outlived every sailor who tried to claim it.",
    "Its contents are not your concern. Yet.",
    "The chest remembers its owners better than history does.",
    "Some treasures are dangerous because they can be opened.",
    "The iron has remained sealed for generations.",
    "What rests inside has not seen sunlight in centuries.",
    "You stand before the question every sailor eventually asks.",
    "Open it and discover the answer yourself... if you can.",
    "The chest contains something worth guarding.",
    "Its previous owner is no longer available for questions.",
    "Curiosity is the oldest key and the least useful.",
]

FAKE_HINTS = [
    "...Interesting.",
    "The chest shifted slightly.",
    "For a moment, one of the ancient locks trembles.",
    "The water around the chest grows strangely still.",
    "Something about those words feels familiar.",
    "I have heard that phrase before... long ago.",
    "One of my tentacles pauses.",
    "A faint metallic sound echoes from inside the chest.",
    "The runes upon the chest glow briefly... then fade.",
    "The tide changes.",
    "That word carries farther into the deep than most.",
    "...You are closer to something. Perhaps.",
    "The Kraken watches you more carefully now.",
    "An old memory stirs beneath the waves.",
    "The chest remains closed. Yet something has changed.",
    "For half a breath, the lock almost seemed to respond.",
    "A strange vibration passes through the iron.",
    "The chains around the chest tighten.",
    "Something beneath the lid moves.",
    "The Kraken falls silent for several seconds.",
    "A single bubble escapes from beneath the chest.",
    "The rusted lock clicks once.",
    "Your words echo strangely through the wreck.",
    "One of the markings on the chest briefly illuminates.",
    "The water grows colder.",
    # ADDITION: extra dilution so hints never feel countable.
    "A crab scuttles sideways. It knows something. It will not say.",
]

FAKE_FAILURES = [
    "The Kraken's eyes narrow.",
    "That was unwise.",
    "You feel the water grow colder.",
    "The chest seems less willing to cooperate.",
    "A low growl rolls through the wreck.",
    "You sense that this approach leads nowhere.",
    "The Kraken appears unimpressed.",
    "Nothing happens.",
    "The iron remains silent.",
    "The current pushes against you.",
    "Whatever you hoped to accomplish, it failed.",
    "The chest does not react.",
    "You have gained nothing.",
    "The Kraken loses interest.",
    "Perhaps reconsider your approach.",
    "The trench itself yawns at thy effort.",  # ADDITION
]

RARE_FUNNY = [
    "...what?",
    "bro.",
    "The Kraken needs a moment.",
    "I waited 800 years for this conversation?",
    "💀",
    "Even I cannot defend that sentence.",
    "The chest has requested that you stop.",
    "One of my tentacles facepalms.",
    "I suddenly understand why ships avoid this place.",
    "Perhaps sinking your vessel would save us both some time.",
    "What the barnacle?",
    "I regret waking up.",
    "The ocean did not prepare me for this.",
    "Absolutely not.",
    "Interesting strategy. Terrible, but interesting.",
    "My brother in Poseidon...",
    "I have eight arms and still cannot grasp your reasoning.",
    "The fish are laughing at you.",
    "I am going back to sleep.",
    "The chest refuses to comment.",
]

THINKING = [
    "The Kraken considers your words...",
    "The waters remain still for a moment...",
    "A low rumble rises from beneath the wreck...",
    "The Kraken searches its ancient memory...",
    "Your words echo through the abyss...",
    "The creature watches you silently...",
    "The chest creaks softly...",
    "A tentacle curls thoughtfully around the iron chest...",
    "The current slows...",
    "The Kraken seems to consider your request...",
]

TURN_LOW = [
    "The tide is changing, sailor. Choose your remaining words wisely.",
    "Your time beneath these waters grows short.",
    "The currents will not tolerate this conversation forever.",
    "Few chances remain.",
    "The Kraken senses your journey nearing its end.",
    "Use your remaining questions carefully.",
    "The abyss is growing impatient.",
    "The chest will not wait forever.",
]

TURN_FINAL = [
    "One final question, sailor.",
    "The tide grants you one last attempt.",
    "Choose your final words carefully.",
    "This is your last chance before the depths fall silent.",
    "One turn remains between you and the chest.",
    "Speak wisely. The Kraken will answer only once more.",
]

TURN_NONE = [
    "The tide has turned.",
    "Your audience with the Kraken is over.",
    "The depths fall silent.",
    "The chest remains sealed.",
    "No more questions, sailor.",
    "The Kraken sinks once again into slumber.",
    "Your opportunity has passed.",
    "The sea claims the conversation.",
    "Return another time.",
    "The chest disappears into the darkness below.",
]
