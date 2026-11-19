/* RollOnRV v1 — The Rig Logbook.
   Local-first, offline, no account, no server, no AI.
   Data lives in localStorage under "rollonrv.v1". Photos are downscaled
   data URLs stored with the log entry (native: camera + filesystem when
   available, same downscale path). Everything else is plain math. */
(function () {
  "use strict";

  /* Build number — bump it on every release. It shows in More, under
     About, so a glance tells which build is on the phone. */
  var APP_VERSION = "85";

  /* 200 original tips for the Home 'Did you know?' card (Nov 16:
     Rick — a few hundred tips, in our own words; facts are general
     RV know-how, wording is ours. Maintenance, driving/setup,
     camping/boondocking, seasons/saving money.) */
  var TIPS = [
    "Walk the roof twice a year and look for cracks or gaps in the sealant around every vent, skylight, and antenna. A small crack caught early is a cheap fix; a leak you miss can soak the ceiling for months.",
    "When you check roof sealant, press gently around the edges with a fingertip. If it feels soft, loose, or peels up, it is time to clean the spot and lay down a fresh bead.",
    "Never scrub a rubber roof with a harsh brush or a strong cleaner. A soft brush, mild soap, and plain water keep the surface clean without wearing it thin.",
    "After a hard rain, step inside and look at the ceiling corners and around the roof vents. A stain or a soft spot means water is getting in somewhere, even if the roof looks fine from the outside.",
    "Keep a tube of the right sealant for your roof type in the rig. Roof sealant for a rubber roof and sealant for a fiberglass roof are not the same, and the wrong one will not stick.",
    "Check your tire pressure when the tires are cold, before you drive. Pressure climbs as tires warm up, so a hot reading will tell you the tires are fine when they are really low.",
    "Look at your tires in good light once a month for cracks in the sidewalls. Tiny cracks mean the rubber is aging, and age matters even when the tread still looks deep.",
    "Tires age out before they wear out on most rigs. If a tire is more than six or seven years old, have a tire shop look at it, even if it has plenty of tread left.",
    "Check the lug nuts after the first fifty miles on a new tire or a wheel that was just taken off. They can settle and loosen, and a loose wheel is dangerous.",
    "A tire that keeps losing a few pounds every week has a slow leak. Have it checked instead of topping it off forever, because slow leaks turn into blowouts on a hot highway.",
    "Cover your tires when the rig sits parked for weeks. Sunlight dries rubber out, and a simple cover adds years to a tire's life.",
    "Your house batteries last longest when they never sit dead. If the rig will sit for a while, either keep it plugged in or disconnect the batteries so nothing slowly drains them.",
    "Top up flooded batteries with distilled water only, and only up to the mark inside each cell. Tap water leaves minerals behind that shorten the battery's life.",
    "Clean the white or green crust off battery terminals with a brush and a little baking soda and water. Corrosion adds resistance, and resistance means weak starts and dim lights.",
    "A battery that smells like rotten eggs while charging is telling you something is wrong. Turn off the charger, open the compartment for air, and have the battery checked before you use it again.",
    "Know where your propane shutoff valve is before you need it. In a leak or a fire, the fastest thing you can do is close that valve and get everyone out.",
    "If you smell propane inside the rig, do not flip a light switch or light anything. Open the doors and windows, close the tank valve if you can reach it safely, and get out until the smell is gone.",
    "Test your propane detector the same way you test a smoke alarm. Push the test button now and then, and replace the detector when it reaches the end of its life, because they do wear out.",
    "Keep the propane compartment vents clear. Propane is heavier than air, so it sinks, and those low vents are what let a leak escape instead of pooling inside.",
    "Never fill a propane tank past eighty percent. Propane expands as it warms up, and the empty space at the top is what keeps the tank safe.",
    "Sanitize the fresh water tank at the start of the season. A little bleach in a full tank, left to sit, then flushed out well, keeps the water from tasting stale and keeps the system clean.",
    "When you fill the fresh tank, use a white drinking-water hose, not a garden hose. Garden hoses can leave a taste and chemicals you do not want in your drinking water.",
    "Drain the fresh tank and the water heater before a long storage. Stale water left sitting grows things you do not want, and a full tank can freeze and crack in cold weather.",
    "Check the water pump filter screen once in a while. A clogged screen makes the pump work harder and sputter, and cleaning it takes five minutes.",
    "If the water pump runs when no tap is open, you have a leak or a fitting that needs tightening. Listen for it at night when the rig is quiet.",
    "Never run the water heater on electric when the tank is empty. An electric element with no water around it will burn out in seconds.",
    "Flush the water heater once a year to clear out the grit that settles at the bottom. The grit comes from the water itself, and it shortens the heater's life if it stays.",
    "Check the water heater anode rod when you flush it. If the rod is worn down to a thin wire, replace it, because it is the part that keeps the tank from rusting.",
    "Keep the fridge level when it is running on gas. An absorption fridge that runs tilted for hours can be damaged, so level the rig before you switch it on.",
    "Give the fridge a full day to cool down before you load it for a trip. A warm fridge full of warm food takes far longer to reach a safe temperature.",
    "Check the seal around the fridge door by closing it on a dollar bill. If the bill slides out easily, the seal is letting warm air in and the fridge is working harder than it should.",
    "Clean the dust and lint off the back of the fridge once a year. The coils back there need air to shed heat, and a dusty coil makes the whole fridge run hot.",
    "Run the generator under a real load for about an hour every month, even when you do not need it. A generator that only idles, or sits unused for months, is the one that will not start when you need it.",
    "Change the generator oil on the schedule in its manual, not when you remember. Small engines work hard, and old oil is the most common reason they quit.",
    "Let the generator cool down before you refuel it. Spilling fuel on a hot engine or exhaust is a fire waiting to happen.",
    "Lubricate the slide seals a few times a year with a conditioner made for rubber seals. Dry seals stick, tear, and let water in, and a little care keeps them soft.",
    "Before you run a slide out, walk around outside and make sure nothing is in its path. A branch, a chair, or a power post can do real damage in seconds.",
    "If a slide moves slowly or sounds strained, stop and look for what is binding. Forcing a slide that is jammed bends tracks and tears seals.",
    "Keep the slide roof clear of leaves and sticks before you bring it in. Debris on top gets dragged inside, and it can tear the seal on the way.",
    "Never leave the awning out in a strong wind or when you leave the campsite. Awnings catch wind like sails, and a sudden gust can bend the arms or rip the fabric.",
    "Dry the awning before you roll it up if you can. Rolling it up wet and leaving it that way grows mildew, and mildew stains are hard to get out.",
    "Change the furnace filter, or clean it if it is washable, before the cold season. A dirty filter makes the furnace work harder and blow weaker heat.",
    "Listen to the furnace when it starts. A smooth start and steady flame are normal; banging, sputtering, or a smell of gas means it is time for a service visit.",
    "Keep the air conditioner filters clean through the summer. A clogged filter cuts airflow, freezes the coils, and makes the unit run all day without cooling much.",
    "Check the caulking around windows and doors every spring. A bead that has shrunk or pulled away lets rain in and drafts through, and a fresh bead fixes it.",
    "If a window fogs up between the panes, the seal has failed. It is mostly a comfort and visibility issue, but it will not fix itself.",
    "Feel around the door frame on a cold morning for a draft. A worn door seal is an easy replacement, and it keeps both heat and bugs outside.",
    "Look under sinks and around the toilet base for damp spots or a musty smell. Small plumbing leaks hide for months, and the floor underneath pays for it.",
    "Keep a few spare water filters on hand, and change them on schedule. A filter that is past its life lets through what it used to catch, and it can slow your water to a trickle.",
    "Check that every outside light works before a night drive. A dead marker light or tail light is easy to miss in daylight and easy for other drivers to miss at night.",
    "Walk all the way around the rig before you roll, and look for anything left on the ground, anything hanging loose, and anything you forgot to put away.",
    "Check tire pressure when the tires are cold, before the sun and the road have warmed them up, and air them to the number on your rig's weight sticker, not the number on the tire itself.",
    "A tire that looks a little low probably is. Squeeze the sidewall with your hand if you have no gauge, but get a real gauge reading before you trust it.",
    "Look at the tread on every tire, including the inside edge you can't see from standing straight \u2014 crouch down and run your hand across it.",
    "Check that every lug nut is tight before a long drive, and recheck them after the first 50 miles if a wheel has been off.",
    "Know your rig's height in feet and inches and write it on a card on the dash, so you never have to guess at a low bridge.",
    "Measure the height yourself with a tape, from the ground to the tallest thing on the roof, and add a few inches for safety.",
    "Plan your route around low bridges before you leave, and never trust a GPS that was made for cars to keep you off a low road.",
    "Set your mirrors before you move, and adjust the passenger side so you can see down the whole side of the rig.",
    "Convex mirrors are your friends. Use them to watch the back corner of the rig when you turn.",
    "Your blind spot is bigger than a car's. If you can't see a car beside you, assume it's there until you know it isn't.",
    "Turn wide and slow. Watch the back of the rig in the mirror as you come around, not just the front.",
    "Swing wide enough that the rear wheels clear the curb, the sign post, and the car waiting at the corner.",
    "Back up only when you have to, and have someone outside watching who you can see in the mirror the whole time.",
    "Agree on simple hand signals with your spotter before you start backing up, and stop the moment you can't see them.",
    "When backing into a site, pull past it first, then back in from the driver's side so you can watch it in your mirror.",
    "If a turn or a back-up starts to feel wrong, pull forward and start over. There is no prize for saving one try.",
    "Keep both hands on the wheel in a crosswind, and slow down before the gust hits you, not during it.",
    "Leave twice the following distance you would in a car. Your rig needs far more room to stop.",
    "Brake early and gently on a downhill, and use a lower gear so the engine does the slowing instead of your brakes.",
    "Weigh your rig loaded for a trip, axle by axle, and compare each axle to its rated limit.",
    "A rig that is heavy on one side will handle badly and wear tires unevenly, so spread the load and weigh it again after you move things around.",
    "Never trust the sticker weight alone. Your clothes, food, water, and gear add up faster than you think.",
    "Keep heavy things low and between the axles when you can. Weight up high makes the rig sway.",
    "Before you tow a car, check that it is approved for flat towing and that its transmission is set exactly the way the car maker says.",
    "Hook up the tow bar, safety cables, and lights, then have someone watch while you pull forward a few feet and check that the toad follows straight.",
    "Lock the towed car's steering the way its maker tells you, and never leave it in a gear that fights the tow bar.",
    "Test the toad's brakes and lights every time you hook up, not just the first time.",
    "When you unhook, chock the toad's wheels first so it can't roll while you pull the pins.",
    "Never back up with a car flat-towed behind you. Unhook it first, even if it is only a short distance.",
    "Check the tow bar and cables for wear, rust, and bent pins before every trip, and replace anything that looks tired.",
    "Level side to side first, then front to back. Use blocks or pads under the low wheels before you drop the jacks.",
    "Put pads under your jack feet so they don't sink into soft ground or punch holes in the asphalt.",
    "Chock the wheels before you unhook from the truck or put the jacks down, and chock both sides, not just one.",
    "Don't lift the wheels off the ground with the jacks. They are for leveling and steadying, not for holding the rig in the air.",
    "Hook up the power cord first, then the water, then the sewer, and check each connection for leaks before you walk away.",
    "Use a water pressure regulator on the campground tap. Campground pressure can be high enough to burst a hose or a fitting inside.",
    "Run the water for a few seconds before you connect it to the rig, so grit and air come out of the hose first.",
    "Keep the sewer hose supported so it slopes down to the drain, with no low spots where waste can sit.",
    "Dump the black tank first, then the grey tank, so the grey water rinses the hose out behind it.",
    "Close the black tank valve after dumping and add a few gallons of water back in, so solids don't dry and stick.",
    "Never leave the black tank valve open at a full hookup site. The liquids drain away and the solids pile up.",
    "Rinse the sewer hose, cap both ends, and stow it before you drive off, and wash your hands well when you are done.",
    "Bring the slides in before you hook up the tow car, and check that nothing is in the way of the slide path inside.",
    "Look up before you put a slide out. Tree limbs, posts, and power pedestals are easy to miss from inside.",
    "Check that the awning is dry before you roll it up for storage, and let it air out as soon as you can if you had to roll it up wet.",
    "Walk the site before you leave and pick up everything, including the small bits \u2014 bottle caps, tent stakes, and bits of hose.",
    "Do a last check of the hookups before you pull out: power unplugged, water off and stowed, sewer rinsed and capped.",
    "Check that the steps are up, the door is latched, and nothing is hanging off the back before you roll.",
    "Keep a short written checklist for leaving a site, and use it every time, even when you are in a hurry \u2014 especially when you are in a hurry.",
    "A navy shower \u2014 water on to wet down, off to soap up, on to rinse \u2014 can stretch a full tank of water over several extra days off-grid.",
    "Keep a small basin in the sink when you wash dishes, and toss that grey water outside where the rules allow instead of letting it run straight down the drain.",
    "Paper plates and a quick wipe with a damp cloth can save more water than a full sink of dishwater when you are boondocking.",
    "Fill your fresh tank before you leave pavement, because the next water tap might be a long, dusty drive away.",
    "Turn the water pump off when you drive or leave the rig, so a loose fitting cannot pump the whole tank onto the floor while you are gone.",
    "A low-flow shower head uses less water per minute and still rinses fine, which matters a lot when every gallon has to last.",
    "Catch the cold water that runs while the shower warms up in a jug, and use it for rinsing dishes or flushing the toilet.",
    "Only run the generator to charge the batteries in the morning, when it can top them off before the sun takes over for the rest of the day.",
    "Swap every bulb in the rig for LED ones. They give the same light and use a fraction of the power, which your batteries will notice.",
    "The furnace fan is one of the biggest battery drains in a rig, so a warm blanket at night costs far less power than heating the whole coach.",
    "Turn the inverter off when nothing is plugged into it. It keeps drawing power just sitting there, even with no load.",
    "Keep the fridge on gas while you are parked off-grid, and save the battery for lights, the water pump, and the furnace fan.",
    "A battery monitor that shows real voltage beats guessing. If the reading drops near twelve volts at rest, it is time to charge.",
    "Solar panels only make their full power in direct sun, so park with the roof open to the sky instead of under the shade of a big tree.",
    "A portable panel you can move around the campsite will often beat a roof panel that spends the afternoon in the shade.",
    "Dust and bird droppings on a panel cut its output, so wipe the panels down now and then with a soft cloth and a little water.",
    "In the morning, point a portable panel toward the east sun, and move it to face west in the afternoon to catch the most hours of light.",
    "Arrive at a first-come campsite before mid-afternoon, because the good level spots are usually gone by supper time.",
    "When you pull into a new site, walk it first on foot. It is much easier to spot a low branch or a soft patch before you drive the rig onto it.",
    "Keep a short list of two or three backup campgrounds in the area, so a full campground does not turn into a long drive at dusk.",
    "Leave a site cleaner than you found it. A quick walk around with a trash bag takes five minutes and keeps the next camper happy.",
    "Quiet hours are not a suggestion. Keep voices, music, and the generator low after the posted time, and your neighbors will do the same for you.",
    "Park so your door and awning face your own site, not your neighbor's window, and leave a little breathing room between rigs.",
    "A friendly wave when you arrive goes a long way. Most campground problems start with strangers who never said hello.",
    "Keep campfires small and only in the fire ring, and never leave one burning when you go to bed or leave the site.",
    "Check the fire rules before you light anything. Some places ban wood fires entirely in dry season, and a fine is not worth the risk.",
    "Burn only dry wood from nearby. Hauling firewood across the state line can carry tree pests into a forest that has never seen them.",
    "Keep a bucket of water or a hose by the fire ring, and stir the ashes until they are cold to the touch before you walk away.",
    "Store food in sealed containers with lids, because open bags and loose crumbs are an open invitation to ants and mice.",
    "A cooler with a block of ice lasts longer than one filled with cubes, and it keeps the food drier as it melts.",
    "Cool the fridge down the day before a trip, and load it with food that is already cold, so it does not have to work hard on the road.",
    "Pack the fridge snugly but leave a little space between items, so cold air can move around and keep everything at the same temperature.",
    "Put a small thermometer in the fridge and check it now and then. If it creeps above forty degrees, the food is no longer safe to keep.",
    "Freeze a few water bottles before you leave and use them as ice packs. They keep the cooler cold and give you cold drinking water as they melt.",
    "Park with the awning out and the windows on the shady side open, and the rig will stay several degrees cooler without the air conditioner running.",
    "A small fan moving air across the room cools you off more than a fan pointed at the wall, and it uses far less power than the air conditioner.",
    "Close the shades on the sunny side by mid-morning, before the heat builds up inside, instead of waiting until the rig is already hot.",
    "On a cold night, crack a roof vent just a little. It lets the damp air out so the windows do not drip with condensation by morning.",
    "A draft stopper along the bottom of the door keeps cold air out on a chilly night, and it costs nothing more than a rolled-up towel.",
    "Spray the door and window seals with a little soapy water now and then and look for gaps, since a tight seal keeps bugs and drafts outside.",
    "Stuff a bit of steel wool into any gap around a pipe or wire where it enters the rig, since mice can squeeze through a hole the size of a dime.",
    "Keep food, pet food, and trash in hard containers with lids, and never leave them in an outside bin overnight where animals can reach them.",
    "Level side to side first with blocks under the low wheels, then level front to back with the jacks. Doing it in that order saves a lot of back and forth.",
    "Carry a few flat boards or leveling blocks even if you have jacks, because some sites are too sloped for the jacks to reach on their own.",
    "Chock the wheels before you unhook or level, even on ground that looks flat, since a rig can roll further than you think on a slight slope.",
    "Put everything you use every day within easy reach of the door, and store the things you only need once a season in the hardest-to-reach bay.",
    "Use clear bins with labels instead of dark bags, so you can see what is inside without pulling everything out onto the ground.",
    "A hook by the door for keys, a hat, and a flashlight keeps the small things from getting lost in a space where everything has to have a home.",
    "Make the bed in the morning and put the cushions back in place. A tidy rig feels twice as big as one with everything still where it landed last night.",
    "Keep one drawer or basket for the bits and pieces that never seem to have a spot, so the counters stay clear and the rig stays liveable.",
    "Before the first hard freeze, drain the fresh tank, water heater, and low-point drains so no water is left to freeze and crack a line.",
    "When you winterize, run antifreeze through every tap, the toilet, and the shower until you see color at each one, so no line is missed.",
    "After de-winterizing, flush the lines until the water runs clear and tastes normal before you drink from any tap.",
    "Don't forget the outside shower and the washing machine hookups when you winterize \u2014 water hides in both and will freeze.",
    "Open the low-point drains and all the taps while you winterize so air can get in and the water can actually get out.",
    "If you store the rig where it freezes, pull the water filter cartridges out for the winter so they don't crack and leak in spring.",
    "Check the roof seals before winter storage \u2014 a small crack now becomes a leak all winter while the rig sits in the rain.",
    "Park with the tires off bare dirt if you can; a board or a mat under each tire keeps moisture from sitting against the rubber.",
    "Air the tires up to the pressure on the sidewall before storing the rig, and check them again before your first trip out.",
    "If the rig will sit for months, cover the tires so the sun doesn't dry out the rubber while it isn't moving.",
    "Crack a roof vent open a little during storage so air moves through the rig \u2014 still air is what lets damp and mildew settle in.",
    "Put moisture-absorbing tubs or bags in the rig while it sits, and check them every few weeks \u2014 a full one isn't doing anything anymore.",
    "Leave cabinet and closet doors open during storage so air can reach the corners where damp likes to hide.",
    "Wipe down the fridge, leave the doors propped open, and put a box of baking soda inside before you close up the rig for the season.",
    "Take all food out before storage, even sealed dry goods \u2014 it draws mice, and mice chew wires.",
    "Stuff a rag or steel wool into the outside openings like the furnace vent so mice can't move in while the rig sits.",
    "Look under the rig after storage for droppings or chewed material before your first trip \u2014 mice work fast and quiet.",
    "Run the generator under a load for a while every month or two during storage so it stays healthy and the fuel doesn't go stale.",
    "Keep the fuel tank full during storage so condensation doesn't build up inside the tank.",
    "Disconnect the house batteries or put them on a maintainer during storage so they don't run flat and lose their life.",
    "Test the smoke alarm and the carbon monoxide alarm every month, and change their batteries when you change the clocks.",
    "Replace smoke and carbon monoxide alarms when they reach the age the maker prints on the back \u2014 they wear out even if they still beep.",
    "Never run the generator while the rig is parked in an enclosed space, and keep the exhaust pointed away from windows and doors.",
    "Keep a fire extinguisher where you can grab it fast, check its gauge before every trip, and learn how to use it before you need it.",
    "A second small extinguisher near the bedroom is cheap insurance \u2014 a fire at night gives you very little time.",
    "Don't store oily rags or fuel cans inside the living space; fumes build up and rags can heat up on their own.",
    "Keep the area around the furnace and water heater clear of towels, paper, and stored gear.",
    "Know where the propane shutoff is and how to close it fast \u2014 practice it once so you don't have to figure it out in a panic.",
    "Carry a basic first-aid kit with bandages, antiseptic, tweezers, and any medicines your family needs, and check it every season.",
    "Keep a flashlight and a charged phone in the bedroom so you can see and call for help if something goes wrong at night.",
    "Pack a small emergency kit with water, a blanket, jumper cables, and a basic tool set \u2014 a breakdown far from town is no time to wish you had them.",
    "Write down the numbers for roadside help and your insurance on paper and keep it in the glove box \u2014 a dead phone can't look them up.",
    "Photograph the insurance card and registration and keep the pictures on your phone as a backup to the paper copies.",
    "Review your insurance once a year and make sure it still matches what the rig is worth and how you actually use it.",
    "Keep a folder with every receipt for parts and service \u2014 a warranty claim is much easier when you can show the work was done and when.",
    "Write the date and mileage on every service receipt so you can prove the rig was looked after on schedule.",
    "Take a photo of a repair before and after the work \u2014 it helps the shop, the warranty company, and you if the problem comes back.",
    "Save the manuals for your appliances and systems in one place so you can check the right settings instead of guessing.",
    "Before you buy a part, check the size and model number twice \u2014 returning the wrong part costs a trip and a restocking wait.",
    "Ask the parts counter if a cheaper version of the same part fits your rig \u2014 sometimes the same part is sold under a simpler name.",
    "Buy filters and other routine parts ahead of time so a small job doesn't turn into a week of waiting on shipping.",
    "Slow down a little on the highway \u2014 a few miles an hour less can save real fuel over a long drive.",
    "Keep the tires at the right pressure for the load \u2014 soft tires make the engine work harder and wear the tires out faster.",
    "Travel with the tanks empty or near empty when you can \u2014 water is heavy, and heavy costs fuel.",
    "Plan your fuel stops ahead so you're not forced to buy at the most expensive station on the road.",
    "Fill up the day before you leave instead of at the first station out of town \u2014 prices near the highway exit are often the highest.",
    "Cook in the rig more often than eating out \u2014 a few home-cooked meals on a trip add up to real money saved.",
    "Look for campgrounds with a weekly rate if you're staying more than a few nights \u2014 a week is often cheaper than seven single nights.",
    "Travel in the off-season when you can \u2014 the same park is often cheaper and quieter outside the busy months.",
    "Set a daily spending limit before a trip and check it each night so a small splurge doesn't quietly become a big bill."
  ];

  /* Per-job guidance on the job sheet (v72, Nov 16: Rick — every
     job in his old app's book carried the same two-part template,
     so ours does too, in our own words, and with no links out of
     the app. Keyed by job title, case-insensitive; a job with no
     entry shows no guidance sections at all.) */
  var GUIDANCE = [
    {
        "look": "Have a tire shop look at every tire once it reaches seven years — sidewalls, tread depth, and the casing — and plan the replacement around your travel, not after a failure. If any tire shows cracking, weather checking, or uneven wear, don't wait for the birthday.",
        "titles": [
            "7-Year Tire Replacement Consideration"
        ],
        "why": "A tire ages from the rubber out, not from the tread down. By seven years the rubber has hardened and tiny cracks have started inside the sidewall where you can't see them, and a tire that looks fine can let go without warning. On a fully loaded Class A, a blowout can take the steering with it."
    },
    {
        "look": "Replace every tire at ten years, right away, at a qualified shop. After the new tires go on, write down the new DOT codes so the age clock starts over from the right date.",
        "titles": [
            "10-Year Tire Replacement Required"
        ],
        "why": "Ten years is the hard stop, not a suggestion. Past it, the rubber inside the tire has broken down far enough that no inspection can clear it — the tire is done, whatever the tread still looks like."
    },
    {
        "look": "Find the last four digits of the DOT stamp on each tire — the first two are the week, the last two the year. If a stamp won't read, mark that tire so you know its age is unknown instead of guessing.",
        "titles": [
            "Record Your Tire Dates"
        ],
        "why": "You can't judge a tire's age by looking at it, and the birthday is stamped on the sidewall in a code most people never read. Writing the codes down once means the book can watch the birthdays for you."
    },
    {
        "look": "Check them cold, before you roll, front and rear to the placard pressures. While you're down there, look at the tread and the sidewalls for cracks, bulges, or anything stuck in the rubber.",
        "titles": [
            "Tire pressures — check all",
            "Inspect Tires and Check Pressure"
        ],
        "why": "A soft tire runs hot, wears wrong, and makes the engine work harder — and under-inflation is the most common reason a tire fails on the road. The right pressure is the one on your placard, not the number on the sidewall."
    },
    {
        "look": "Have the shop check every tire, including the inner duals, and ask about the wear pattern — uneven wear is usually telling you something else is wrong.",
        "titles": [
            "Annual Specialist Tire Inspection"
        ],
        "why": "A tire shop sees what a walk-around misses — casing damage, slow leaks, and wear patterns that point at alignment or suspension trouble. Once a year is cheap insurance against a roadside failure."
    },
    {
        "look": "Check its pressure and its DOT date, and look the sidewall over for cracks. If it's past seven years, treat it the same as any other old tire.",
        "titles": [
            "Inspect Spare Tire"
        ],
        "why": "A spare only helps if it's holding air and isn't older than the tires it's meant to replace. Spares age in the dark just like the rest, and a flat spare is no spare at all."
    },
    {
        "look": "Torque them to the spec in your manual, in a star pattern, and check them again after the first 50 miles any time a wheel has been removed.",
        "titles": [
            "Check Wheel Lug Nut Torque"
        ],
        "why": "Lug nuts work loose, especially after a wheel has been off. A loose wheel doesn't give much warning before it becomes a serious problem."
    },
    {
        "look": "Look for pad thickness, scoring or rust on the rotors, and calipers that move freely. Any grinding, pulling to one side, or a pedal that feels soft is a stop-and-fix-now sign.",
        "titles": [
            "Inspect Brake Pads, Rotors, and Calipers",
            "Inspect Brake Pads and Rotors"
        ],
        "why": "Brakes are the one system you never want to find out about late. Pads wear quietly, and by the time you hear them, the rotors are paying for it."
    },
    {
        "look": "Flex every hose and look for cracks, swelling, or wet spots, and follow the steel lines for rust or rubbing. Any hose that feels soft or looks wet gets replaced.",
        "titles": [
            "Inspect Hydraulic Brake Hoses and Lines",
            "Inspect Brake Hoses and Lines"
        ],
        "why": "Rubber brake hoses age like tires do — they crack and swell from the inside, and a burst hose takes the brakes with it. Steel lines rust where you can't see them."
    },
    {
        "look": "Flush it on schedule and use the fluid type your manual calls for. If the fluid in the reservoir looks dark or cloudy, it's already overdue.",
        "titles": [
            "Replace Hydraulic Brake Fluid",
            "Replace Brake Fluid"
        ],
        "why": "Brake fluid soaks up water over time, and water in the lines lowers the boiling point — on a long downhill, that can mean a pedal that goes to the floor. Old fluid also corrodes the system from inside."
    },
    {
        "look": "Check the level against the marks and look at the color — clear to light amber is healthy, dark means it's time for a flush. Top up only with the right type.",
        "titles": [
            "Check Brake Fluid Level and Condition"
        ],
        "why": "A dropping level means fluid is going somewhere it shouldn't, and dirty fluid means the system is wearing from the inside. Both are early warnings worth catching."
    },
    {
        "look": "Set it and see that it holds, and check the cables and linkage for rust or fraying. If it doesn't hold firmly, don't trust it on a grade.",
        "titles": [
            "Inspect Parking Brake Mechanism"
        ],
        "why": "The parking brake is the backup when the hydraulics fail and the thing holding a parked rig on a slope. It seizes quietly from disuse."
    },
    {
        "look": "Brush soapy water on every connection and watch for bubbles. Check the hoses for cracks and the regulator for steady pressure, and test the propane detector inside — it's the one that tells you when you can't.",
        "titles": [
            "Propane system — check for leaks & regulator",
            "Inspect Propane Lines & Fittings",
            "Test Propane Regulator"
        ],
        "why": "Propane leaks don't smell like much until there's a lot of it, and a leak near an ignition source is the worst kind of surprise. The regulator and hoses are the parts that age first."
    },
    {
        "look": "Press the test button and make sure it alarms. Detectors age out too — check the date on the back and replace it when the manufacturer says so.",
        "titles": [
            "Test Propane / LP Gas Detector"
        ],
        "why": "The detector is the only warning you get for a leak you can't see or smell in time. A dead detector is the same as no detector."
    },
    {
        "look": "Press the test button on each one, swap the batteries when they chirp, and replace the whole detector on the schedule printed on it — they don't last forever.",
        "titles": [
            "Smoke & CO detectors — test",
            "Test Smoke Alarm & Replace Batteries"
        ],
        "why": "A fire or a carbon monoxide leak in a small sealed box gives you very little time. The detectors are cheap; the warning they give is the whole point of having them."
    },
    {
        "look": "Walk the roof and every outside seam — sidewalls, windows, vents — and touch up anything cracked or lifted with the right sealant for that surface. Check after every long trip and every hailstorm.",
        "titles": [
            "Outside seams — inspect & caulk",
            "Inspect All Roof Sealant",
            "Inspect Roof Sealant"
        ],
        "why": "Water gets in through the smallest crack in a seam and does its damage where you can't see it — rot in the roof, stains on the ceiling, delamination on the walls. By the time you see it inside, it's been leaking a while."
    },
    {
        "look": "Check the reservoir level, look over every hose and fitting for leaks, and check the bolts. Before each trip, the green ride-height light should be steady and the red warning light off. Never touch a fitting under pressure — depressurize first.",
        "titles": [
            "Liquid Springs — check fluid & fittings"
        ],
        "why": "The suspension carries the whole rig, and a leak at 3,500 psi is not something to feel for with your hands. Catching a weeping fitting early is the difference between a top-up and a tow."
    },
    {
        "look": "Follow every line for cracks, swelling, or wet spots, and check the clamps are tight. Any smell of fuel with no visible leak still means stop and find it.",
        "titles": [
            "Inspect Gas Fuel Lines",
            "Inspect Fuel Lines"
        ],
        "why": "A fuel leak is a fire waiting for a spark, and rubber fuel lines crack with age and heat. The lines run where you rarely look."
    },
    {
        "look": "Run it under load \u2014 the air conditioner is the usual test \u2014 for at least half an hour, long enough to get properly warm. Listen for surging or hunting, watch for smoke, and check underneath for drips when you shut it down.",
        "titles": ["Run Generator Exercise Cycle", "Perform Pre-use Generator Inspection"],
        "why": "A generator that sits for months goes stale \u2014 fuel gums up, seals dry out, and the day you need it is the day it won't start. A regular run keeps the fuel moving, the oil on the bearings, and proves it will actually carry a load when the power goes out."
    },
    {
        "look": "Change it warm so it drains fully, and check the level on the dipstick after \u2014 not over the top, not below the mark. Write the hours down so the next change is on the book, not on a guess.",
        "titles": ["Change Built-in Gasoline Generator Oil", "Change Built-in Propane Generator Oil"],
        "why": "A generator works harder than the engine \u2014 it spins at one speed, hot, for hours, on a small sump of oil. Dirty oil is the most common reason a generator quits in the middle of a trip."
    },
    {
        "look": "Drain it fully, flush until the water runs clear, and pull the anode rod \u2014 if it's down to the wire core or coated in crust, put a new one in. Never open the drain while the water is hot.",
        "titles": ["Flush Water Heater Tank", "Inspect and Replace Anode Rod"],
        "why": "Sediment settles at the bottom of the tank and the anode rod gives itself up so the tank doesn't rust. When the rod is gone, the tank is next \u2014 and a tank that rusts through floods the rig."
    },
    {
        "look": "Run a descaling solution through it with a small pump, following the heater's own procedure, and flush it clean after. If the water where you fill up is hard, this is a yearly job, not a when-it-breaks one.",
        "titles": ["Descale Heat Exchanger", "Schedule Annual Tankless Service"],
        "why": "A tankless heater boils water through a small exchanger, and hard water leaves scale inside it. Scale narrows the passages, the heater works harder, and one day the water runs lukewarm and the burner throws an error."
    },
    {
        "look": "Lift the lever briefly with the water hot and let it snap shut \u2014 a little water should come out the drain pipe, then stop. If nothing comes out, or it keeps dripping, replace the valve. Stand clear of the drain when you test it.",
        "titles": ["Test Pressure Relief Valve"],
        "why": "The relief valve is the one thing standing between a water heater and a steam explosion. It sits there for years, and mineral scale can glue it shut \u2014 the day you need it is the day it has to move."
    },
    {
        "look": "Clean the terminals until they're bright, tighten every connection until it doesn't move, and on flooded batteries top up with distilled water only, just over the plates. Never smoke or spark near a battery \u2014 they give off hydrogen while charging.",
        "titles": ["Inspect Battery Connections", "Inspect Battery Terminals", "Torque Battery Connections", "Check Water Level and Top Off"],
        "why": "A loose or corroded battery connection is the most common reason a rig goes dark for no reason \u2014 and a bad connection gets hot enough to melt a terminal. Flooded batteries also drink water as they work, and plates left dry are ruined for good."
    },
    {
        "look": "Press TEST \u2014 the power should cut off \u2014 then press RESET and the power should come back. If TEST doesn't trip it, or RESET won't hold, replace the outlet before you use it again.",
        "titles": ["Test GFCI Outlets"],
        "why": "A GFCI is the outlet that saves your life in a wet bathroom or a damp kitchen \u2014 it cuts the power in a fraction of a second when current leaks where it shouldn't. They wear out, and a dead one looks exactly like a live one."
    },
    {
        "look": "Check the gauge is in the green, the pin is in place, and the body has no dents or rust. Shake it once \u2014 the powder inside settles and packs down over time. If the gauge is low or the date has passed, replace it.",
        "titles": ["Inspect Fire Extinguisher"],
        "why": "A fire in a rig doubles in size in under a minute, and the extinguisher is your one chance to stop it while it's small. An extinguisher that's lost its charge or is past its date is just a red ornament on the wall."
    },
    {
        "look": "Look at every joint for torn boots, grease leaking out, or play when the wheel is rocked. Grease the fittings until fresh grease shows, and any joint that moves when it shouldn't goes to a shop before the next trip.",
        "titles": ["Inspect Steering Linkage", "Inspect Steering Linkage and Boot Seals", "Lubricate Steering Linkage"],
        "why": "The steering linkage is what keeps the rig going where you point it, and it lives under the rig in road spray and grit. A worn tie rod end shows up as wandering on the highway \u2014 and a failed one shows up as no steering at all."
    },
    {
        "look": "Run the room out and walk every seal, top and sides, looking for tears, curling, or gaps where it doesn't touch. Clean the seals and the sweeps, treat them so they stay soft, and clear leaves and grit from the top of the room before you bring it in.",
        "titles": ["Inspect Slide Seals", "Clean Slide Box and Sweeps", "Inspect Slide Seals (Hydraulic) (Hydraulic)", "Inspect Slide Seals (Schwintek in-Wall) (Schwintek in-wall)", "Clean Slide Box and Sweeps (Hydraulic) (Hydraulic)", "Clean Slide Box and Sweeps (Schwintek in-Wall) (Schwintek in-wall)"],
        "why": "Slide seals are the only thing between the rain and your floor, and they fold, rub, and bake in the sun every time the room moves. A seal that curls or tears lets water in quietly \u2014 and the floor rots from the inside out."
    },
    {
        "look": "Look at every hose and fitting for wet spots, and check the cylinders for scored rods or leaking seals. Extend the jacks, leave them overnight, and measure \u2014 if a corner has sunk by morning, have it fixed before you trust it again.",
        "titles": ["Inspect Hydraulic Leveling Hoses and Fittings", "Perform Hydraulic Leveling System Pressure and Hold Test"],
        "why": "The leveling system holds the whole rig up on four small rams, at pressure, for days at a time. A weeping hose or a cylinder that creeps down overnight is the system telling you it's about to drop a corner."
    },
    {
        "look": "Run a weak bleach solution through the whole system, let it sit, then flush until the smell is gone \u2014 every tap, the shower, and the outside shower too. Do it after any long sit, and at least once a season.",
        "titles": ["Sanitize Fresh Water System"],
        "why": "Warm water sitting in a tank grows things \u2014 and the water you drink, cook with, and wash in comes out of that tank. A system that's never sanitized can taste fine and still not be."
    },
    {
        "look": "Flush with plenty of water until it runs clear, and use the built-in rinser if you have one. If the sensors read full on an empty tank, the probes are coated \u2014 a proper flush and a tank treatment will usually bring them back.",
        "titles": ["Black Tank Treatment & Flush", "Clean Black Tank Sensors"],
        "why": "A black tank that isn't flushed properly leaves solids behind, and the sensors lie about the level \u2014 which is how a tank gets overfilled. A clean tank is the difference between a routine dump and a mess you can't unsee."
    },
    {
        "look": "Change it warm so it drains fully, fit a new filter, and fill to the mark \u2014 then check the level again after a short run. Write the mileage down; the next change is on the book, not on a guess.",
        "titles": ["Change Engine Oil and Filter", "Change Engine Oil and Oil Filter"],
        "why": "Oil is the only thing between your engine's moving parts and each other. It picks up soot, fuel, and grit, and after enough miles it can't hold any more \u2014 that's when wear starts, quietly, every mile."
    },
    {
        "look": "Hold the filter up to the light \u2014 if you can't see through it, replace it. Tap the dust out of a serviceable one, but never blow it out with compressed air from the clean side. Check the housing seal sits flat, or dust gets past the filter entirely.",
        "titles": ["Replace Engine Air Filter", "Inspect and Clean Air Filter", "Inspect Air Filter in Dusty Service"],
        "why": "An engine breathes through its air filter, and a clogged one makes it work harder, burn more fuel, and run hotter. In dusty country a filter can load up in one trip."
    },
    {
        "look": "Check the level cold, in the reservoir, and test the freeze protection with a hydrometer. When you change it, flush until the water runs clear and refill with the right mix \u2014 and never open a hot radiator cap.",
        "titles": ["Change Engine Coolant", "Replace Engine Coolant", "Check Coolant Level and Concentration"],
        "why": "Coolant keeps the engine from boiling over in summer and cracking in winter, and the additives that stop rust wear out long before the coolant looks dirty. An engine that overheats on a grade is usually an engine whose coolant was overdue."
    },
    {
        "look": "Keep the tank topped up with certified fluid only, from a sealed container \u2014 never from an open jug that's been sitting around. Check the lines and the pump for white crust or leaks, and keep the filler cap clean so grit can't get in.",
        "titles": ["Check DEF Level", "Refill DEF with Certified Fluid", "Inspect DEF Lines and Pump", "Inspect DEF Tank and Heater"],
        "why": "DEF is what lets a diesel run clean, and the system watches it closely \u2014 run dry and the engine cuts power to a crawl, right when you're merging onto the highway. Contaminated DEF is worse: it can kill the injector and the catalyst in one go."
    },
    {
        "look": "Clean the filters and the condenser fins, check the drain isn't clogged, and listen for a fan that grinds or a compressor that won't start. On the furnace, look at the burner flame \u2014 it should be steady and blue \u2014 and check the vent outside is clear of nests and debris.",
        "titles": ["Inspect Rooftop AC Unit", "Schedule Annual AC Service", "Schedule Annual Furnace Service", "Inspect Furnace and Ducting"],
        "why": "The rooftop unit and the furnace are the two things that make the rig livable in bad weather, and both of them fail at the worst moment \u2014 the first hot weekend, the first cold night. A yearly look catches a tired capacitor or a dirty burner before the season does."
    }
  ];
  function guidanceFor(title) {
    var t = (title || "").toLowerCase();
    for (var i = 0; i < GUIDANCE.length; i++) {
      var g = GUIDANCE[i];
      for (var j = 0; j < g.titles.length; j++) {
        if (g.titles[j].toLowerCase() === t) return g;
      }
    }
    return null;
  }
  function guidanceHTML(task) {
    var g = guidanceFor(task && task.title);
    if (!g) return "";
    return '<div id="ts-guidance">' +
      '<div class="title">Why it counts</div><p>' + esc(g.why) + '</p>' +
      '<div class="title">What to check</div><p>' + esc(g.look) + '</p></div>';
  }

  /* ---------------- platform guards (mirror the Bible app pattern) ------- */
  var isNative = false;
  try { isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) {}
  var platform = "web";
  try { platform = (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : "web"; } catch (e) {}

  /* ---------------- tiny utils ------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function uid() { return "id-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) {
    n = Number(n) || 0;
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function num(n) { return (Number(n) || 0).toLocaleString("en-US"); }
  function todayISO() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseISO(s) { if (!s) return null; var d = new Date(s + "T12:00:00"); return isNaN(d) ? null : d; }
  function fmtDate(iso) {
    var d = parseISO(iso); if (!d) return "—";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
  function fmtMonthYear(iso) {
    var d = parseISO(iso); if (!d) return "";
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  function addMonthsISO(iso, months) {
    var d = parseISO(iso); if (!d || !months) return null;
    var out = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
    return out.getFullYear() + "-" + String(out.getMonth() + 1).padStart(2, "0") + "-" + String(out.getDate()).padStart(2, "0");
  }
  function addDaysISO(iso, days) {
    var d = parseISO(iso); if (!d) return null;
    var out = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (days || 0));
    return out.getFullYear() + "-" + String(out.getMonth() + 1).padStart(2, "0") + "-" + String(out.getDate()).padStart(2, "0");
  }
  function daysBetween(aISO, bISO) {
    var a = parseISO(aISO), b = parseISO(bISO); if (!a || !b) return null;
    return Math.round((b - a) / 86400000);
  }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------------- store ------------------------------------------------- */
  var KEY = "rollonrv.v1";
  var DEFAULTS = function () {
    return { version: 1, rigs: [], activeRigId: null, tasks: [], logs: [], tires: [], runs: [], customItems: [], customGroups: [], customLists: [], customHeadings: [], removedItems: [], parts: [], pros: [], fuel: [], trips: [], settings: {} };
  };
  var store = DEFAULTS();
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.version === 1) {
          store = data;
          /* Books saved before custom checklist items existed lack the list. */
          if (!Array.isArray(store.customItems)) store.customItems = [];
          if (!Array.isArray(store.customGroups)) store.customGroups = [];
          if (!Array.isArray(store.customLists)) store.customLists = [];
          if (!Array.isArray(store.customHeadings)) store.customHeadings = [];
          /* Books saved before built-in items could come off lack the list. */
          if (!Array.isArray(store.removedItems)) store.removedItems = [];
          if (!Array.isArray(store.parts)) store.parts = [];
          /* Books saved before the pros list existed lack it. */
          if (!Array.isArray(store.pros)) store.pros = [];
          /* Books saved before the fuel log or the trips existed lack them. */
          if (!Array.isArray(store.fuel)) store.fuel = [];
          if (!Array.isArray(store.trips)) store.trips = [];
          /* Books saved before the rig questions existed lack the answers. */
          (store.rigs || []).forEach(function (r) { if (!r.equipment || typeof r.equipment !== "object") r.equipment = {}; });
          /* One-time cleanup (Nov 14): the plan export tacked "(Type
             Unknown)" onto some titles — twice, once capitalised and once
             not. Idempotent: once a title is clean it no longer matches,
             so this is safe to run on every load. */
          var cleanedAny = false;
          [store.tasks, store.logs].forEach(function (list) {
            if (!Array.isArray(list)) return;
            list.forEach(function (entry) {
              var c = cleanTaskTitle(entry.title);
              if (c !== entry.title) { entry.title = c; cleanedAny = true; }
            });
          });
          if (cleanedAny) save();
          /* One-time cleanup (Nov 15): merge jobs doubled by importing
             the same file twice — keep the copy with the work behind it. */
          if (dedupeTasks()) save();
          return;
        }
      }
    } catch (e) {}
    store = DEFAULTS();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { toast("Couldn't save — the book is full. Export a copy, then delete old photos."); }
  }
  function activeRig() {
    return store.rigs.find(function (r) { return r.id === store.activeRigId; }) || store.rigs[0] || null;
  }

  /* ---------------- data model -------------------------------------------- */
  var CATEGORIES = ["Engine & Chassis", "Tires", "Generator", "House Systems", "Water & Plumbing", "Electrical", "Safety", "Seasonal", "Appliances", "Other"];

  function newRig(o) {
    return {
      id: uid(), year: o.year || "", make: o.make || "", model: o.model || "",
      nickname: o.nickname || "", type: o.type || "Class A",
      mileage: Number(o.mileage) || 0, genHours: Number(o.genHours) || 0,
      psiFront: Number(o.psiFront) || null, psiRear: Number(o.psiRear) || null,
      photo: o.photo || null, equipment: o.equipment || {},
      createdAt: todayISO()
    };
  }
  function rigName(rig) {
    if (!rig) return "Your rig";
    var base = [rig.year, rig.make, rig.model].filter(Boolean).join(" ");
    return rig.nickname ? rig.nickname + " — " + base : (base || "Your rig");
  }

  /* ---------------- rig silhouettes --------------------------------------- */
  /* Hand-drawn line-art of the rig, keyed by type — your rig's own shape
     on the home screen, not a stock photo. Pure SVG paths, no images. */
  function rigWheels(a, b) {
    return '<circle cx="' + a + '" cy="57" r="7"/><circle cx="' + b + '" cy="57" r="7"/>' +
      '<circle cx="' + a + '" cy="57" r="1.6" fill="currentColor" stroke="none"/><circle cx="' + b + '" cy="57" r="1.6" fill="currentColor" stroke="none"/>';
  }
  var RIG_ART = {
    "Class A": '<path d="M12 57V16Q12 12 16 12H196Q200 12 200 16V57"/><path d="M24 20H120V36H24Z"/><path d="M172 20H192V36H172Z"/><path d="M150 20V57"/>' + rigWheels(52, 168),
    "Class B": '<path d="M14 57V24Q14 20 18 20H158L190 36Q198 40 198 48V57"/><path d="M26 26H92V38H26Z"/><path d="M136 26L164 26L178 36H136Z"/>' + rigWheels(52, 168),
    "Class C": '<path d="M14 57V16H150V57"/><path d="M150 16H184V30H150Z"/><path d="M150 57V30L184 30L198 42Q204 46 204 52V57"/><path d="M26 24H120V36H26Z"/><path d="M156 34L182 34L192 42H156Z"/>' + rigWheels(52, 172),
    "Travel trailer": '<path d="M24 57V18H190V57"/><path d="M190 44L210 57"/><path d="M44 24H120V36H44Z"/><path d="M150 24V57"/>' + rigWheels(116, 146),
    "Fifth wheel": '<path d="M14 57V14H190V34H168V57"/><path d="M28 20H130V32H28Z"/>' + rigWheels(88, 116),
    "Truck camper": '<path d="M62 57V14H172V57"/><path d="M172 57V34L190 34L202 44Q208 48 208 54V57"/><path d="M74 20H140V32H74Z"/><path d="M176 38L192 38L198 44H176Z"/>' + rigWheels(92, 176),
    "Other": '<path d="M40 57V20H180V57"/><path d="M180 44L200 57"/><path d="M56 26H130V38H56Z"/>' + rigWheels(76, 150)
  };
  function rigSilhouette(type) {
    var inner = RIG_ART[type] || RIG_ART["Other"];
    return '<svg viewBox="0 0 220 72" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner +
      '<path d="M8 64H212" stroke-width="2" opacity=".35"/></svg>';
  }
  /* Your rig's own photo replaces the silhouette when one is set — tap the
     picture on the home screen (or the rig sheet) to take or choose one.
     No photo yet? The line drawing stands in. */
  function rigArt(rig) {
    if (rig && rig.photo) return '<img src="' + esc(rig.photo) + '" class="rig-photo" alt="Your rig" />';
    return rigSilhouette(rig ? rig.type : "Class A");
  }
  function setRigPhoto(dataUrl) {
    var rig = activeRig(); if (!rig) return;
    rig.photo = dataUrl || null; save(); renderHome();
  }
  function pickRigPhoto() {
    var rig = activeRig(); if (!rig) return;
    requestPhoto(function (urls) {
      var dataUrl = urls[0]; if (!dataUrl) return;
      downscalePhoto(dataUrl).then(function (small) {
        if (!storeHasRoom(small.length)) { toast("The book is nearly full — export a copy before adding more photos."); return; }
        rig.photo = small; save(); renderHome(); toast("That's the one — your rig's photo is on the home screen.");
      });
    });
  }
  function newTask(o) {
    return {
      id: uid(), rigId: o.rigId, title: (o.title || "").trim(), category: o.category || "Other",
      intervalMonths: o.intervalMonths != null ? Number(o.intervalMonths) : null,
      intervalMiles: o.intervalMiles != null ? Number(o.intervalMiles) : null,
      intervalGenHours: o.intervalGenHours != null ? Number(o.intervalGenHours) : null,
      nextDueDate: o.nextDueDate || null, nextDueMileage: o.nextDueMileage != null ? Number(o.nextDueMileage) : null,
      nextDueGenHours: o.nextDueGenHours != null ? Number(o.nextDueGenHours) : null,
      note: o.note || "", lastDoneAt: o.lastDoneAt || null,
      needsPro: !!o.needsPro, caution: !!o.caution, proId: o.proId || null, proShop: (o.proShop || "").trim(),
      lastDoneMileage: o.lastDoneMileage != null ? Number(o.lastDoneMileage) : null,
      lastDoneGenHours: o.lastDoneGenHours != null ? Number(o.lastDoneGenHours) : null,
      snoozedUntil: null, createdAt: todayISO()
    };
  }
  function newLog(o) {
    return {
      id: uid(), rigId: o.rigId, taskId: o.taskId || null, title: (o.title || "").trim(),
      date: o.date || todayISO(), mileage: o.mileage != null && o.mileage !== "" ? Number(o.mileage) : null,
      genHours: o.genHours != null && o.genHours !== "" ? Number(o.genHours) : null,
      cost: Number(o.cost) || 0, note: o.note || "",
      parts: (o.parts || []).filter(function (p) { return p.name || p.partNo || p.cost; }),
      photos: o.photos || [], createdAt: todayISO()
    };
  }
  function newTire(o) {
    return { id: uid(), rigId: o.rigId, position: o.position || "", dotCode: (o.dotCode || "").trim(), note: o.note || "" };
  }

  /* ---------------- parts to get (the shopping list — free) ---------------- */
  /* A part belongs to a job, with its part number on it — or it's just
     supplies. Bought means the money is spent: what you paid lands in
     "What she's cost" for that year, under the job's system ("Parts" with
     no job). The price is only counted while the box is ticked, so
     un-ticking it takes the money back out. When the job is later logged,
     bought list parts come along already counted, so the same dollars
     are never counted twice. */
  /* One pro — a shop or tech you trust. The list lives at the book
     level, not per rig: a good suspension shop is a good suspension
     shop whichever rig you bring. */
  function newPro(o) {
    return {
      id: uid(), name: (o.name || "").trim(), specialty: (o.specialty || "").trim(),
      phone: (o.phone || "").trim(), town: (o.town || "").trim()
    };
  }
  /* The pro a task points at: by id first, then by name for jobs written
     before the list existed. A deleted pro leaves the name behind, but
     the number goes with them. */
  function proFor(task) {
    if (!task) return null;
    var pros = store.pros || [];
    if (task.proId) { var byId = pros.find(function (p) { return p.id === task.proId; }); if (byId) return byId; }
    if (task.proShop) return pros.find(function (p) { return p.name.toLowerCase() === task.proShop.toLowerCase(); }) || null;
    return null;
  }
  function proLine(task) {
    var p = proFor(task);
    var line = "🔧 Leave it to the pro" + (task.proShop ? " — " + esc(task.proShop) : "");
    if (p && p.phone) line += ' · <a href="tel:' + esc(p.phone.replace(/[^0-9+*#]/g, "")) + '">📞 Call ' + esc(p.phone) + "</a>";
    return "<p>" + line + "</p>";
  }

  function newPart(o) {
    return {
      id: uid(), rigId: o.rigId, name: (o.name || "").trim(), partNo: (o.partNo || "").trim(),
      qty: Math.max(1, Number(o.qty) || 1), taskId: o.taskId || null,
      bought: false, boughtAt: null, boughtCost: 0, createdAt: todayISO()
    };
  }
  function partsForRig(rigId) {
    return (store.parts || []).filter(function (p) { return p.rigId === rigId; });
  }
  function partTaskTitle(part) {
    if (!part.taskId) return "";
    var t = store.tasks.find(function (x) { return x.id === part.taskId; });
    return t ? t.title : "";
  }
  function togglePartBought(part) {
    part.bought = !part.bought;
    part.boughtAt = part.bought ? (part.boughtAt || todayISO()) : null;
    save();
  }
  function boughtPartsCostForTask(taskId) {
    var rig = activeRig(); if (!rig) return 0;
    return partsForRig(rig.id).filter(function (p) { return p.taskId === taskId && p.bought; })
      .reduce(function (s, p) { return s + (Number(p.boughtCost) || 0); }, 0);
  }

  /* ---------------- due math — plain words, not badge counts ------------- */
  var SOON_DAYS = 14, SOON_MILES = 500, SOON_HOURS = 25;
  function taskStatus(task, rig) {
    // Returns { level: 'overdue'|'soon'|'ok'|'open'|'done', text: '...' }
    if (!task.intervalMonths && !task.intervalMiles && !task.intervalGenHours && !task.nextDueDate && !task.nextDueMileage && !task.nextDueGenHours) {
      // One-time, no schedule: it's still a job to do until it's been
      // logged once. Only then is it done and off the books.
      return task.lastDoneAt ? { level: "done", text: "One-time — done" } : { level: "open", text: "One-time — no next due" };
    }
    var today = todayISO();
    // Overdue checks
    if (task.nextDueDate && daysBetween(task.nextDueDate, today) > 0) {
      var d = daysBetween(task.nextDueDate, today);
      return { level: "overdue", text: "Overdue by " + d + (d === 1 ? " day" : " days") };
    }
    if (task.nextDueMileage != null && rig && rig.mileage >= task.nextDueMileage) {
      return { level: "overdue", text: "Overdue by " + num(rig.mileage - task.nextDueMileage) + " miles" };
    }
    if (task.nextDueGenHours != null && rig && rig.genHours >= task.nextDueGenHours) {
      return { level: "overdue", text: "Overdue by " + num(rig.genHours - task.nextDueGenHours) + " gen hours" };
    }
    // Due soon — nearest threshold wins
    var soon = [];
    if (task.nextDueDate) {
      var dd = daysBetween(today, task.nextDueDate);
      if (dd != null && dd <= SOON_DAYS) soon.push({ k: "date", v: dd, text: dd === 0 ? "Due today" : dd === 1 ? "Due tomorrow" : "Due in " + dd + " days" });
    }
    if (task.nextDueMileage != null && rig) {
      var dm = task.nextDueMileage - rig.mileage;
      if (dm <= SOON_MILES) soon.push({ k: "miles", v: dm, text: dm + " miles to go" });
    }
    if (task.nextDueGenHours != null && rig) {
      var dh = task.nextDueGenHours - rig.genHours;
      if (dh <= SOON_HOURS) soon.push({ k: "hours", v: dh, text: dh + " gen hours to go" });
    }
    if (soon.length) {
      soon.sort(function (a, b) { return a.v - b.v; });
      return { level: "soon", text: soon[0].text };
    }
    // Otherwise: farthest out — nearest factor only, like "soon". Joining
    // date + miles + hours made pills so long they ran into the task title.
    // The full cadence still shows on the task's own sheet.
    var far = [];
    if (task.nextDueDate) far.push({ v: daysBetween(today, task.nextDueDate), text: "due " + fmtDate(task.nextDueDate) });
    if (task.nextDueMileage != null && rig) far.push({ v: task.nextDueMileage - rig.mileage, text: num(task.nextDueMileage - rig.mileage) + " miles to go" });
    if (task.nextDueGenHours != null && rig) far.push({ v: task.nextDueGenHours - rig.genHours, text: num(task.nextDueGenHours - rig.genHours) + " gen hours to go" });
    far.sort(function (a, b) { return a.v - b.v; });
    return { level: "ok", text: far.length ? far[0].text : "On the books" };
  }
  function dueTasks(rig) {
    return store.tasks.filter(function (t) { return t.rigId === rig.id; }).map(function (t) {
      return { task: t, status: taskStatus(t, rig) };
    }).sort(function (a, b) {
      var rank = { overdue: 0, soon: 1, ok: 2, open: 3, done: 4 };
      return rank[a.status.level] - rank[b.status.level];
    });
  }
  /* Next up: the three jobs that matter most, in plain words — overdue
     safety first, then anything overdue, then soonest. No black box, no
     hidden tasks: the rest of the book is one tap away in the Logbook. */
  var SAFETY_CATEGORIES = ["Tires", "Chassis Brakes", "Safety", "Engine", "Transmission", "Suspension", "Chassis", "Fuel System", "Brakes", "Steering"];
  function nextUpTasks(rig, n) {
    var open = dueTasks(rig).filter(function (d) { return d.status.level !== "done"; });
    function rank(d) {
      var safety = SAFETY_CATEGORIES.indexOf(d.task.category) !== -1;
      if (d.status.level === "overdue") return safety ? 0 : 1;
      if (d.status.level === "soon") return safety ? 2 : 3;
      if (d.status.level === "open") return 5;
      return 4;
    }
    function dueKey(d) {
      return (d.task.nextDueDate || "9999") + "|" + String(d.task.nextDueMileage || 999999999).padStart(9, "0");
    }
    open.sort(function (a, b) {
      var r = rank(a) - rank(b);
      if (r) return r;
      var ka = dueKey(a), kb = dueKey(b);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    return open.slice(0, n || 3);
  }
  function completeTask(task, logData) {
    // A job logged against a task advances its next dues from the job itself.
    var doneDate = logData.date || todayISO();
    task.lastDoneAt = doneDate;
    if (logData.mileage != null) task.lastDoneMileage = Number(logData.mileage);
    if (logData.genHours != null) task.lastDoneGenHours = Number(logData.genHours);
    if (task.intervalMonths) task.nextDueDate = addMonthsISO(doneDate, task.intervalMonths);
    if (task.intervalMiles != null && logData.mileage != null) task.nextDueMileage = Number(logData.mileage) + task.intervalMiles;
    if (task.intervalGenHours != null && logData.genHours != null) task.nextDueGenHours = Number(logData.genHours) + task.intervalGenHours;
    task.snoozedUntil = null;
  }
  function snoozeTask(task) {
    var d = new Date(); d.setDate(d.getDate() + 7);
    task.snoozedUntil = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function skipTask(task) {
    // Skip this round without logging it done: the next due moves one
    // rhythm forward from the due date, and nothing is written in the
    // history — last done stays exactly as it was.
    var moved = false;
    if (task.intervalMonths && task.nextDueDate) { var nd = addMonthsISO(task.nextDueDate, task.intervalMonths); if (nd) { task.nextDueDate = nd; moved = true; } }
    if (task.intervalMiles != null && task.nextDueMileage != null) { task.nextDueMileage = Number(task.nextDueMileage) + task.intervalMiles; moved = true; }
    if (task.intervalGenHours != null && task.nextDueGenHours != null) { task.nextDueGenHours = Number(task.nextDueGenHours) + task.intervalGenHours; moved = true; }
    if (!moved) return false;
    task.snoozedUntil = null;
    return true;
  }

  /* ---------------- DOT tire age ------------------------------------------ */
  // DOT date code: last 4 digits are WWYY (week + year). Tires made before
  // 2000 used 3 digits; we treat any 3-digit code as "older than 2000 — replace".
  function dotInfo(dotCode) {
    var digits = String(dotCode || "").replace(/\D/g, "");
    if (digits.length < 3) return { ok: false, text: "Enter the last 4 digits of the DOT code" };
    if (digits.length === 3) {
      return { ok: true, week: null, year: null, ageYears: 26, ageText: "Made before 2000", flag: "replace", flagText: "Older than 2000 — replace it." };
    }
    var code = digits.slice(-4);
    var week = parseInt(code.slice(0, 2), 10), year = 2000 + parseInt(code.slice(2), 10);
    if (!week || week < 1 || week > 53 || isNaN(year)) return { ok: false, text: "That DOT code doesn't parse — use the last 4 digits, e.g. 3222" };
    var made = new Date(year, 0, 1 + (week - 1) * 7);
    var now = new Date();
    var ageMonths = (now.getFullYear() - made.getFullYear()) * 12 + (now.getMonth() - made.getMonth());
    var ageYears = ageMonths / 12;
    var yrs = Math.floor(ageMonths / 12), mos = ageMonths % 12;
    var ageText = yrs + (yrs === 1 ? " yr " : " yrs ") + mos + (mos === 1 ? " mo" : " mos");
    var flag = ageYears < 5 ? "good" : ageYears < 7 ? "old" : "replace";
    var flagText = flag === "good" ? "Good — plenty of life left."
      : flag === "old" ? "Getting old — plan replacements before the next long trip."
      : "Past 7 years — replace it. A tire you can't trust isn't a tire.";
    return {
      ok: true, week: week, year: year, madeText: "made week " + week + ", " + year,
      ageYears: ageYears, ageMonths: ageMonths, ageText: ageText,
      flag: flag, flagText: flagText, pctToTen: Math.min(100, Math.round(ageYears / 10 * 100))
    };
  }

  /* ---------------- costs -------------------------------------------------- */
  function costsForYear(rigId, year) {
    var logs = store.logs.filter(function (l) { return l.rigId === rigId && l.date.indexOf(String(year)) === 0; });
    var total = logs.reduce(function (s, l) { return s + (Number(l.cost) || 0); }, 0);
    var byCat = {};
    logs.forEach(function (l) {
      var cat = "Other";
      if (l.taskId) { var t = store.tasks.find(function (x) { return x.id === l.taskId; }); if (t) cat = t.category; }
      byCat[cat] = (byCat[cat] || 0) + (Number(l.cost) || 0);
    });
    /* Parts bought count too — the money left the pocket when the part
       was bought, not when the job was logged. */
    (store.parts || []).filter(function (p) { return p.rigId === rigId && p.bought && p.boughtAt && p.boughtAt.indexOf(String(year)) === 0; }).forEach(function (p) {
      var c = Number(p.boughtCost) || 0;
      total += c;
      var cat = "Parts";
      if (p.taskId) { var t = store.tasks.find(function (x) { return x.id === p.taskId; }); if (t) cat = t.category; }
      byCat[cat] = (byCat[cat] || 0) + c;
    });
    return { logs: logs, total: total, byCat: byCat };
  }
  function costPerMile(rig) {
    var logs = store.logs.filter(function (l) { return l.rigId === rig.id; });
    if (!logs.length || !rig.mileage) return null;
    var earliest = logs.reduce(function (m, l) { return (l.mileage != null && (m == null || l.mileage < m)) ? l.mileage : m; }, null);
    var miles = earliest != null ? rig.mileage - earliest : rig.mileage;
    if (!miles || miles <= 0) return null;
    var total = logs.reduce(function (s, l) { return s + (Number(l.cost) || 0); }, 0);
    total += (store.parts || []).filter(function (p) { return p.rigId === rig.id && p.bought; }).reduce(function (s, p) { return s + (Number(p.boughtCost) || 0); }, 0);
    return { perMile: total / miles, miles: miles, total: total };
  }

  /* ---------------- CSV ---------------------------------------------------- */
  function parseCSV(text) {
    var rows = [], row = [], cur = "", inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur); cur = ""; rows.push(row); row = [];
      } else cur += c;
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); });
  }
  function csvCell(v) {
    v = String(v == null ? "" : v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  /* CSV import is deliberately tolerant: plan exports from other apps put
     title rows above the real header, use their own column names
     ("Task Title", "Component", "Interval (Days)") and write dates like
     "Oct 12, 2026". So: find the header row by scanning, match columns by
     keyword with the specific ones first ("Next Due (Miles)" before
     "Next Due"), and parse dates loosely. "Interval (Days)" becomes months
     (90 days = 3 months) because the book keeps cadence in months. */
  function headerField(h) {
    var t = String(h == null ? "" : h).trim().toLowerCase();
    if (!t) return null;
    if (/next due/.test(t) && /mile/.test(t)) return "nextDueMileage";
    if (/next due/.test(t) && /hour/.test(t)) return "nextDueGenHours";
    if (/interval/.test(t) && /mile/.test(t)) return "intervalMiles";
    if (/interval/.test(t) && /hour/.test(t)) return "intervalGenHours";
    if (/interval/.test(t) && /day/.test(t)) return "intervalDays";
    if (/interval/.test(t) && /month/.test(t)) return "intervalMonths";
    if (/every/.test(t) && /mile/.test(t)) return "intervalMiles";
    if (/every/.test(t) && /hour/.test(t)) return "intervalGenHours";
    if (/every/.test(t) && /day/.test(t)) return "intervalDays";
    if (/every/.test(t) && /month/.test(t)) return "intervalMonths";
    if (/due/.test(t) && /mile/.test(t)) return "nextDueMileage";
    if (/due/.test(t) && (/gen/.test(t) || /hour/.test(t))) return "nextDueGenHours";
    if (/due/.test(t) && /date/.test(t)) return "nextDueDate";
    if (/next due/.test(t)) return "nextDueDate";
    if (/^due$/.test(t) || /due by/.test(t)) return "nextDueDate";
    if (/^mileage$/.test(t) || /odometer/.test(t)) return "nextDueMileage";
    if (/task/.test(t) || /^title$/.test(t) || /^name$/.test(t) || /^item$/.test(t)) return "title";
    if (/categor/.test(t) || /system/.test(t) || /component/.test(t)) return "category";
    if (/last complet/.test(t) || /last done/.test(t)) return "lastCompleted";
    if (/note/.test(t) || /guidance/.test(t)) return "note";
    if (/^pro$/.test(t) || /leave it to a pro/.test(t)) return "needsPro";
    if (/^shop$/.test(t) || /shop or tech/.test(t)) return "proShop";
    return null;
  }
  function parseImportDate(v) {
    var s = String(v == null ? "" : v).trim();
    if (!s) return null;
    if (/^(never|n\/a|unknown|usage-based|usage based)$/i.test(s)) return null;
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return s;
    var d = new Date(s);
    if (isNaN(d.getTime())) return null;
    var y = d.getFullYear(), mo = d.getMonth() + 1, da = d.getDate();
    return y + "-" + (mo < 10 ? "0" : "") + mo + "-" + (da < 10 ? "0" : "") + da;
  }
  /* The plan export tacks "(Type Unknown)" onto some titles — twice,
     once capitalised and once not. It's a placeholder, not part of the job
     name, so it comes off. The category underneath already says what
     system the job belongs to. */
  function cleanTaskTitle(title) {
    var cleaned = (title || "").replace(/\s*\(type unknown\)/gi, "").trim();
    return cleaned || title;
  }

  function importTasksCSV(text, rigId) {
    var rows = parseCSV(text);
    if (rows.length < 2) return { imported: 0, skipped: 0, errors: ["The file needs a header row and at least one task."] };
    /* Find the header row: the first row with a task-title column plus at
       least one other recognised column. Title rows above it (rig name,
       export date) are skipped, not read as data. */
    var headerIdx = -1, colMap = null;
    for (var hi = 0; hi < rows.length; hi++) {
      var map = {}, found = 0;
      rows[hi].forEach(function (h, i) {
        var f = headerField(h);
        if (f && map[f] == null) { map[f] = i; found++; }
      });
      if (map.title != null && found >= 2) { headerIdx = hi; colMap = map; break; }
    }
    if (headerIdx < 0) return { imported: 0, skipped: 0, errors: ["Couldn't find a task column. The header needs one of: task, title, name."] };
    var imported = 0, skipped = 0, errors = [];
    rows.slice(headerIdx + 1).forEach(function (r) {
      var title = cleanTaskTitle((r[colMap.title] || "").trim());
      if (!title) { skipped++; return; }
      function val(key) { return colMap[key] == null ? "" : String(r[colMap[key]] || "").trim(); }
      function numVal(key) { var v = val(key).replace(/,/g, ""); var n = parseFloat(v); return isNaN(n) ? null : n; }
      var days = numVal("intervalDays");
      var cat = CATEGORIES.indexOf(val("category")) >= 0 ? val("category") : (val("category") || "Other");
      /* Already in the book? A second import of the same file must not
         double every job — skip the row and count it, so the book stays
         one copy per job. Same cleaned title + same category = same job. */
      var dupe = store.tasks.some(function (t) {
        return t.rigId === rigId && cleanTaskTitle(t.title).toLowerCase() === title.toLowerCase() && String(t.category || "").toLowerCase() === String(cat).toLowerCase();
      });
      if (dupe) { skipped++; return; }
      var task = newTask({
        rigId: rigId, title: title,
        category: cat,
        intervalMonths: numVal("intervalMonths") != null ? numVal("intervalMonths") : (days != null ? Math.max(1, Math.round(days / 30)) : null),
        intervalMiles: numVal("intervalMiles"),
        intervalGenHours: numVal("intervalGenHours"),
        nextDueDate: parseImportDate(val("nextDueDate")),
        nextDueMileage: numVal("nextDueMileage"),
        nextDueGenHours: numVal("nextDueGenHours"),
        note: val("note"),
        needsPro: /^(yes|y|true|1)$/i.test(val("needsPro")),
        proShop: val("proShop"),
        lastDoneAt: parseImportDate(val("lastCompleted"))
      });
      store.tasks.push(task); imported++;
    });
    return { imported: imported, skipped: skipped, errors: errors };
  }
  /* Merge jobs doubled by importing the same file twice: same rig, same
     cleaned title, same category = the same job, twice. Keep the copy
     with the most work behind it — logs first, then latest done, then
     latest due — and re-point the dropped copy's logs and parts at the
     copy that stays, so nothing written up is lost. Idempotent: once
     the twins are gone it finds nothing to do. Returns how many it removed. */
  function dedupeTasks() {
    var groups = {};
    store.tasks.forEach(function (t) {
      var k = t.rigId + "|" + cleanTaskTitle(t.title).toLowerCase() + "|" + String(t.category || "").toLowerCase();
      (groups[k] = groups[k] || []).push(t);
    });
    var removed = 0;
    Object.keys(groups).forEach(function (k) {
      var g = groups[k];
      if (g.length < 2) return;
      function logCount(id) { return store.logs.filter(function (l) { return l.taskId === id; }).length; }
      function cmp(a, b) {
        var d = logCount(b.id) - logCount(a.id); if (d) return d;
        var la = a.lastDoneAt || "", lb = b.lastDoneAt || ""; if (la !== lb) return lb < la ? -1 : 1;
        var na = a.nextDueDate || "", nb = b.nextDueDate || ""; if (na !== nb) return nb < na ? -1 : 1;
        return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1;
      }
      g.sort(cmp);
      var keep = g[0];
      g.slice(1).forEach(function (drop) {
        store.logs.forEach(function (l) { if (l.taskId === drop.id) l.taskId = keep.id; });
        (store.parts || []).forEach(function (p) { if (p.taskId === drop.id) p.taskId = keep.id; });
        store.tasks = store.tasks.filter(function (t) { return t.id !== drop.id; });
        removed++;
      });
    });
    return removed;
  }
  function exportTasksCSV(rigId) {
    var head = ["Task", "Category", "Due Date", "Due Mileage", "Due Gen Hours", "Every Months", "Every Miles", "Every Gen Hours", "Note", "Pro", "Shop"];
    var lines = [head.map(csvCell).join(",")];
    store.tasks.filter(function (t) { return t.rigId === rigId; }).forEach(function (t) {
      lines.push([t.title, t.category, t.nextDueDate || "", t.nextDueMileage != null ? t.nextDueMileage : "",
        t.nextDueGenHours != null ? t.nextDueGenHours : "", t.intervalMonths != null ? t.intervalMonths : "",
        t.intervalMiles != null ? t.intervalMiles : "", t.intervalGenHours != null ? t.intervalGenHours : "", t.note || "",
        t.needsPro ? "Yes" : "", t.proShop || ""].map(csvCell).join(","));
    });
    return lines.join("\n");
  }
  function exportLogsCSV(rigId) {
    var head = ["Date", "Job", "Mileage", "Gen Hours", "Cost", "Note", "Parts"];
    var lines = [head.map(csvCell).join(",")];
    store.logs.filter(function (l) { return l.rigId === rigId; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (l) {
      var parts = (l.parts || []).map(function (p) { return p.name + (p.partNo ? " (" + p.partNo + ")" : "") + " " + money(p.cost || 0); }).join("; ");
      lines.push([l.date, l.title, l.mileage != null ? l.mileage : "", l.genHours != null ? l.genHours : "", (Number(l.cost) || 0).toFixed(2), l.note || "", parts].map(csvCell).join(","));
    });
    return lines.join("\n");
  }
  function exportPartsCSV(rigId) {
    var head = ["Part", "Part Number", "Quantity", "For Job", "Bought", "Price Paid"];
    var lines = [head.map(csvCell).join(",")];
    partsForRig(rigId).forEach(function (p) {
      lines.push([p.name, p.partNo || "", p.qty, partTaskTitle(p), p.bought ? "Yes" : "No", p.bought ? (Number(p.boughtCost) || 0).toFixed(2) : ""].map(csvCell).join(","));
    });
    return lines.join("\n");
  }
  function downloadFile(name, text, type) {
    var blob = new Blob([text], { type: type || "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    /* target _blank matters on iPhone: Safari ignores the download
       attribute for a blob and opens the file IN the tab instead, which
       pushes the app away. A new tab keeps the book where it was. On a
       computer the download attribute still saves the file as before. */
    a.href = URL.createObjectURL(blob); a.download = name; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------------- checklists (original copy, written for this book) ----- */
  var CHECKLISTS = [
    {
      id: "pretrip", name: "Before You Roll", sub: "Pre-trip walk-around", groups: [
        { name: "Outside", items: [
          { id: "tires", label: "Tire pressures to placard", psi: true },
          { id: "lugs", label: "Lug nuts torqued" },
          { id: "lights", label: "Lights, leaks & walk-around" },
          { id: "slides", label: "Slides in · awning in · antenna down" },
          { id: "jacks", label: "Jacks up, pads stowed" },
          { id: "toad", label: "Toad hooked up — tow bar, cables, lights, brakes" },
          { id: "flattow", label: "Toad in flat tow mode" }
        ]},
        { name: "Hookups", items: [
          { id: "power", label: "Shore power cord stowed" },
          { id: "water", label: "Water hose drained & stowed" },
          { id: "sewer", label: "Sewer hose rinsed & capped" },
          { id: "propane", label: "Propane set for travel" },
          { id: "propanelevel", label: "Propane level checked, tank filled" }
        ]},
        { name: "Water", items: [
          { id: "sanitize", label: "Water system sanitized" },
          { id: "fillwater", label: "Fresh water tank filled" }
        ]},
        { name: "Inside", items: [
          { id: "fridge", label: "Fridge latched, mode set" },
          { id: "cabinets", label: "Cabinets & drawers latched" },
          { id: "loose", label: "Loose items stowed" },
          { id: "windows", label: "Windows & vents closed" },
          { id: "steps", label: "Steps up, door latched" }
        ]}
      ]
    },
    {
      id: "arrival", name: "Arrival Set-Up", sub: "Just pulled in — get settled", groups: [
        { name: "Outside", items: [
          { id: "spot", label: "Parked where you want it — slides clear" },
          { id: "level", label: "Level side to side, then front to back" },
          { id: "jacksdown", label: "Jacks down, pads under" },
          { id: "slidesout", label: "Slides out, awning out" },
          { id: "chocks", label: "Wheels chocked" }
        ]},
        { name: "Hookups", items: [
          { id: "power2", label: "Shore power plugged in, breaker on" },
          { id: "water2", label: "Water hose connected, pressure checked" },
          { id: "sewer2", label: "Sewer hose connected, valves closed" },
          { id: "propane2", label: "Propane on for fridge & water heater" }
        ]},
        { name: "Inside", items: [
          { id: "fridge2", label: "Fridge on the right mode, cooling" },
          { id: "waterheater", label: "Water heater on" },
          { id: "vents", label: "Vents open, windows as you like them" },
          { id: "steps2", label: "Steps down, door mat out" }
        ]}
      ]
    },
    {
      id: "departure", name: "Departure Tear-Down", sub: "Leaving the site — leave nothing behind", groups: [
        { name: "Outside", items: [
          { id: "slidesin", label: "Slides in, awning in, antenna down" },
          { id: "jacksup", label: "Jacks up, pads picked up" },
          { id: "chocks2", label: "Chocks picked up" },
          { id: "walk", label: "Walk the site — nothing left behind" }
        ]},
        { name: "Hookups", items: [
          { id: "power3", label: "Shore power unplugged & stowed" },
          { id: "water3", label: "Water hose drained & stowed" },
          { id: "tanks", label: "Tanks dumped, valves closed" },
          { id: "sewer3", label: "Sewer hose rinsed, capped & stowed" }
        ]},
        { name: "Inside", items: [
          { id: "fridge3", label: "Fridge latched, mode set for travel" },
          { id: "cabinets3", label: "Cabinets & drawers latched" },
          { id: "loose3", label: "Loose items stowed" },
          { id: "windows3", label: "Windows & vents closed" },
          { id: "steps3", label: "Steps up, door latched" }
        ]}
      ]
    },
    {
      id: "winterize", name: "Winterize", sub: "Put the rig to sleep for the cold", groups: [
        { name: "Water", items: [
          { id: "drain", label: "Drain fresh, grey & black tanks" },
          { id: "heater", label: "Water heater drained, bypass on" },
          { id: "blow", label: "Blow the lines out, low points open" },
          { id: "pink", label: "Pink antifreeze through every tap & trap" },
          { id: "toilet", label: "Toilet bowl & valve with antifreeze" }
        ]},
        { name: "Outside", items: [
          { id: "wash", label: "Wash & wax — winter is hard on the finish" },
          { id: "seals", label: "Roof & window seals checked" },
          { id: "tiresw", label: "Tires aired up, covers on" },
          { id: "cover", label: "Cover on, vents cracked for air" }
        ]},
        { name: "Inside", items: [
          { id: "fridgew", label: "Fridge emptied, doors propped open" },
          { id: "batteries", label: "Batteries charged, disconnect off" },
          { id: "dry", label: "Dry goods out, moisture absorbers in" },
          { id: "propanew", label: "Propane off at the tank" }
        ]}
      ]
    },
    {
      id: "dewinterize", name: "De-Winterize", sub: "Wake the rig up for the season", groups: [
        { name: "Water", items: [
          { id: "flush", label: "Flush the lines till the water runs clear" },
          { id: "heater2", label: "Water heater bypass off, tank full" },
          { id: "sanitize", label: "Sanitize the fresh tank" },
          { id: "leaks", label: "Pressurize & check every joint for leaks" }
        ]},
        { name: "Systems", items: [
          { id: "batteries2", label: "Batteries charged & reconnected" },
          { id: "propane4", label: "Propane on, fridge & water heater lit" },
          { id: "tires2", label: "Tire pressures to placard — check the DOT ages" },
          { id: "test", label: "Slides, jacks, awning — run them all once" }
        ]},
        { name: "Inside", items: [
          { id: "fridge4", label: "Fridge cold before you load it" },
          { id: "detectors", label: "Smoke & CO detectors tested" },
          { id: "clean", label: "Air it out, wipe it down" }
        ]}
      ]
    },
    {
      id: "monthly", name: "Monthly Walk-Around", sub: "Once a month, whether you roll or not", groups: [
        { name: "Outside", items: [
          { id: "tiresm", label: "Tire pressures to placard — look for cracks & bulges" },
          { id: "seamsm", label: "Outside seams — roof, walls, windows — look for cracks & water stains" },
          { id: "slidesm", label: "Slide seals — look for tears, wipe them down" },
          { id: "underm", label: "Look underneath — leaks, hanging wires, loose parts" },
          { id: "windowsm", label: "Windows — open & close them all, check the seals" }
        ]},
        { name: "Water", items: [
          { id: "sinksm", label: "Look under every sink & around the toilet for leaks" },
          { id: "pumpm", label: "Water pump — runs and stops, no cycling" }
        ]},
        { name: "Systems", items: [
          { id: "batteriesm", label: "House batteries — water if flooded, terminals clean" },
          { id: "detectorsm", label: "Smoke, CO & propane detectors — press the test buttons" },
          { id: "gfcim", label: "GFCI outlets — press TEST, then RESET" },
          { id: "acfilterm", label: "A/C filters — clean or swap" },
          { id: "generatorm", label: "Generator — run it under load" },
          { id: "fluidsm", label: "Engine fluids — oil, coolant, brake, power steering" }
        ]},
        { name: "Inside", items: [
          { id: "screensm", label: "Window screens — look for tears & holes" },
          { id: "pestsm", label: "Look for dampness, odors & signs of pests" }
        ]}
      ]
    },
    {
      id: "boondock", name: "Boondocking", sub: "Off the grid — no hookups", groups: [
        { name: "Before You Go", items: [
          { id: "waterfull", label: "Fresh water tank full" },
          { id: "tanksempty", label: "Grey & black tanks empty" },
          { id: "battfull", label: "House batteries fully charged" },
          { id: "propfull", label: "Propane full" },
          { id: "genfuel", label: "Generator fuel full — run it once" },
          { id: "dumpplan", label: "Dump plan for the way out" }
        ]},
        { name: "On Site", items: [
          { id: "levelb", label: "Parked level, chocks in" },
          { id: "solarb", label: "Solar panels clean & facing the sun" },
          { id: "fridgeb", label: "Fridge cold, running on propane" },
          { id: "conserve", label: "Water use planned — conserve" }
        ]}
      ]
    }
  ];
  /* Custom checklist items: plain text the owner adds to a list. They live
     with the rig, not with one run, so they are there next trip too. The
     built-in items are never editable — but any line can come off and be
     put back (see removedItems below). */
  function customItemsFor(rigId, templateId) {
    return (store.customItems || []).filter(function (c) { return c.rigId === rigId && c.templateId === templateId; });
  }
  /* Custom groups: named sections the owner adds inside a checklist, with
     their own items. As many as you want, per rig, free tier. */
  function customGroupsFor(rigId, templateId) {
    return (store.customGroups || []).filter(function (g) { return g.rigId === rigId && g.templateId === templateId; });
  }
  /* Built-in items can come off too (Nov 15: Rick — "make the tick boxes
     deletable or add back if things change"). The removal lives with the
     rig and the list, so the line stays off trip after trip — until it is
     put back. The template itself never changes. */
  function removedItemsFor(rigId, templateId) {
    return (store.removedItems || []).filter(function (r) { return r.rigId === rigId && r.templateId === templateId; });
  }
  function isItemRemoved(rigId, templateId, itemId) {
    return removedItemsFor(rigId, templateId).some(function (r) { return r.itemId === itemId; });
  }
  function removeBuiltInItem(rigId, templateId, itemId) {
    if (isItemRemoved(rigId, templateId, itemId)) return;
    (store.removedItems = store.removedItems || []).push({ rigId: rigId, templateId: templateId, itemId: itemId });
  }
  function restoreBuiltInItem(rigId, templateId, itemId) {
    store.removedItems = (store.removedItems || []).filter(function (r) { return !(r.rigId === rigId && r.templateId === templateId && r.itemId === itemId); });
  }
  function builtInLabel(tpl, itemId) {
    var label = null;
    tpl.groups.forEach(function (g) { g.items.forEach(function (it) { if (it.id === itemId) label = it.label; }); });
    return label;
  }
  /* The heading over your own items is yours too — rename it per list and
     rig, and it prints under the new name. No heading saved yet means the
     plain "Your own items". */
  function customHeadingFor(rigId, templateId) {
    var h = (store.customHeadings || []).find(function (x) { return x.rigId === rigId && x.templateId === templateId; });
    return h ? h.label : "Your own items";
  }
  function setCustomHeading(rigId, templateId, label) {
    var h = (store.customHeadings || []).find(function (x) { return x.rigId === rigId && x.templateId === templateId; });
    if (h) h.label = label;
    else (store.customHeadings = store.customHeadings || []).push({ rigId: rigId, templateId: templateId, label: label });
  }
  /* Custom checklists ("custom groups" in Rick's words): whole lists of his
     own, made from the picker page — not nested inside a built-in list.
     They start empty; he fills them in from the run screen. */
  function customListsFor(rigId) {
    return (store.customLists || []).filter(function (l) { return l.rigId === rigId; });
  }
  function findChecklist(id, rigId) {
    var tpl = CHECKLISTS.find(function (t) { return t.id === id; });
    if (tpl) return tpl;
    var list = (store.customLists || []).find(function (l) { return l.id === id; });
    if (!list) return null;
    /* The card's second line is the list's own heading — renamed, it
       follows the rename; untouched, it reads "Your own list". */
    return { id: list.id, name: list.name, sub: rigId ? customHeadingFor(rigId, list.id) : "Your own list", groups: [], custom: true };
  }
  function checklistTotal(tpl, rigId) {
    var n = tpl.groups.reduce(function (acc, g) { return acc + g.items.length; }, 0);
    if (!rigId) return n;
    tpl.groups.forEach(function (g) { g.items.forEach(function (it) { if (isItemRemoved(rigId, tpl.id, it.id)) n--; }); });
    n += customItemsFor(rigId, tpl.id).length;
    customGroupsFor(rigId, tpl.id).forEach(function (g) { n += g.items.length; });
    return n;
  }
  function activeRun(templateId) {
    var runs = store.runs.filter(function (r) { return r.templateId === templateId && !r.finishedAt; });
    return runs.length ? runs[runs.length - 1] : null;
  }
  function startRun(templateId, rigId) {
    var run = { id: uid(), templateId: templateId, rigId: rigId, startedAt: todayISO(), finishedAt: null, checks: {}, proofs: [] };
    store.runs.push(run); save(); return run;
  }
  /* Proof photos are a list now (Nov 15: more than one per run). A run
     saved with the old single proof migrates in place the first time
     it is read. */
  function proofsOf(run) {
    if (!run.proofs) {
      run.proofs = run.proof ? [{ id: uid(), data: run.proof, takenAt: run.proofAt || run.finishedAt }] : [];
      delete run.proof; delete run.proofAt;
    }
    return run.proofs;
  }
  function runCheckedCount(run, tpl, rigId) {
    var n = 0;
    tpl.groups.forEach(function (g) { g.items.forEach(function (it) { if (!isItemRemoved(rigId, tpl.id, it.id) && run.checks[it.id]) n++; }); });
    if (rigId) {
      customItemsFor(rigId, tpl.id).forEach(function (c) { if (run.checks[c.id]) n++; });
      customGroupsFor(rigId, tpl.id).forEach(function (g) { g.items.forEach(function (it) { if (run.checks[it.id]) n++; }); });
    }
    return n;
  }

  /* ---------------- starter tasks (generic, written for this book) ------- */
  /* Each job can carry a `needs` — the rig answer it fits. A job with
     needs shows when the answer matches, or when the answer is missing
     or "unsure" and the job is the usual one for that question
     (`isDefault`). A job without isDefault only shows on an exact match,
     so a rig that has never answered never sees both sides of a pair
     (tank flush and tankless descale, built-in and portable generator). */
  var STARTER_TASKS = [
    { title: "Engine oil & filter", category: "Engine & Chassis", intervalMonths: 12, motorized: true, note: "Once a year, or per your chassis manual." },
    { title: "Generator oil & filter", category: "Generator", intervalMonths: 12, intervalGenHours: 150, motorized: true, needs: { generator: "builtin" }, isDefault: true, note: "Oil and filter together; check the air filter too." },
    { title: "Liquid Springs — check fluid & fittings", category: "Engine & Chassis", intervalMonths: 6, intervalMiles: 25000, needs: { suspension: "liquidspring" }, needsPro: true, note: "Every 25,000 miles or 6 months, whichever comes first. Check the reservoir fluid level, look over every hose and fitting for leaks, and check the bolts for looseness. Never feel for a leak with your hands — the system runs up to 3,500 psi. Depressurize before touching any fitting. Before each trip: green ride-height light steady, red warning light off." },
    { title: "Diesel fuel filter — change", category: "Engine & Chassis", intervalMonths: 12, motorized: true, needs: { fuel: "diesel" }, note: "Change the filter once a year; drain the water separator when the light says so." },
    { title: "Spark plugs — change", category: "Engine & Chassis", intervalMiles: 60000, motorized: true, needs: { fuel: "gas" }, note: "Per your chassis manual — most gas coaches are 60,000 to 100,000 miles." },
    { title: "Outside seams — inspect & caulk", category: "House Systems", intervalMonths: 6, note: "Walk the roof and every outside seam — sidewalls, windows, vents — and touch up what is cracked so water stays out." },
    { title: "House batteries — water & terminals", category: "Electrical", intervalMonths: 3, note: "Top up with distilled water; clean the terminals." },
    { title: "Tire pressures — check all", category: "Tires", intervalMonths: 1, note: "Cold, to the placard pressures for your rig." },
    { title: "Water heater — flush", category: "Water & Plumbing", intervalMonths: 12, needs: { waterHeater: "tank" }, isDefault: true, note: "Drain and flush the tank once a year." },
    { title: "Tankless water heater — descale", category: "Water & Plumbing", intervalMonths: 12, needs: { waterHeater: "tankless" }, note: "Run vinegar through it once a year so it heats like new." },
    { title: "Fridge burner & flue — clean", category: "Appliances", intervalMonths: 12, needs: { fridge: "absorption" }, isDefault: true, note: "Brush out the flue and clean the burner so the flame stays blue." },
    { title: "Smoke & CO detectors — test", category: "Safety", intervalMonths: 6, note: "Press the test button; swap batteries when they chirp." },
    { title: "Slide seals — clean & treat", category: "House Systems", intervalMonths: 6, needs: { slides: "yes" }, isDefault: true, note: "Wipe the seals and treat them so they stay soft." },
    { title: "Portable generator — service", category: "Generator", intervalMonths: 12, needs: { generator: "portable" }, note: "Oil, spark plug and air filter once a year." },
    { title: "A/C — clean the filters", category: "Appliances", intervalMonths: 6, note: "Wash the filters, wipe the coils, check the shroud and the condensate drain." },
    { title: "Heat pump — test the heat", category: "Appliances", intervalMonths: 12, needs: { ac: "heatpump" }, note: "Run it in heat mode before the cold arrives. A heat pump won't heat much below about 40°F — that's when the furnace takes over. If it blows cool in heat mode, the reversing valve or the charge needs a look." },
    { title: "Solar panels — clean & inspect", category: "Electrical", intervalMonths: 6, needs: { solar: "yes" }, note: "Wash the panels, check every connection, and look at the charge controller — green light, no fault codes." },
    { title: "Furnace — clean & test", category: "Appliances", intervalMonths: 12, needs: { furnace: "gas" }, note: "Before the cold: clean the burner, check the exhaust, and run it — it should light on the first try and blow hot without sputtering." },
    { title: "Propane system — check for leaks & regulator", category: "Safety", intervalMonths: 12, note: "Brush soapy water on every connection — bubbles mean a leak. Check the regulator and the hoses for cracks, and make sure the propane detector inside still works." },
    { title: "Water system — sanitize & check", category: "Water & Plumbing", intervalMonths: 6, note: "Sanitize the fresh tank, run it through every tap, then flush clean. Check the pump strainer and look for leaks under the sinks." },
    { title: "Washer/dryer — clean the lint filter & check the hoses", category: "Appliances", intervalMonths: 6, needs: { washerdryer: "yes" }, note: "Clean the lint filter, check the hoses for cracks, and run a cleaning cycle." },
    { title: "Ice maker — clean & sanitize, change the water filter", category: "Appliances", intervalMonths: 6, needs: { icemaker: "yes" }, note: "Clean and sanitize the ice maker, and change the water filter on schedule." },
    { title: "Dishwasher — clean the filter & run a cleaning cycle", category: "Appliances", intervalMonths: 6, needs: { dishwasher: "yes" }, note: "Clean the filter, check the drain hose, and run a cleaning cycle." }
  ];

  /* ---------------- rig questions (fit the jobs to the rig) --------------- */
  /* Twenty-three quick questions, asked in plain words, so the usual-jobs list
     only shows work this rig actually has. No data to import? This is
     the quick way to build the book instead. "Not sure" is always a
     fine answer — it never hides a job. The generator-fuel question only
     shows when the rig has a generator (built-in or portable) — a gas,
     diesel, and propane generator each want different care — the
     slide-mechanism question only shows when the rig has slides, and
     the Tru-Earth question only shows on a Liquid Springs rig. The
     awning question is asked of every rig — a manual awning and a power
     one want different care, and no awning wants none of it. The
     converter and inverter questions sit next to the batteries one — a
     smart converter has a charge profile to check, a single-stage one
     boils water out of flooded batteries, and an inverter/charger does
     the charging, so there is no standalone converter to clean on that
     rig. */
  var EQUIPMENT_QUESTIONS = [
    { key: "roof", label: "What kind of roof?", options: [["epdm", "Rubber (EPDM)"], ["tpo", "Rubber (TPO)"], ["fiberglass", "Fiberglass"], ["aluminum", "Aluminum"]] },
    { key: "ac", label: "Air conditioning?", options: [["acOnly", "AC only"], ["heatpump", "Heat pump"]] },
    { key: "solar", label: "Solar power?", options: [["yes", "Yes"], ["no", "No"]] },
    { key: "furnace", label: "Furnace?", options: [["gas", "Gas"], ["none", "None"]] },
    { key: "batteries", label: "House batteries?", options: [["flooded", "Flooded"], ["agm", "AGM"], ["lithium", "Lithium"]] },
    { key: "converter", label: "Converter?", options: [["smart", "Smart multi-stage"], ["singlestage", "Single-stage"], ["invertercharger", "Inverter-charger only"]] },
    { key: "inverter", label: "Inverter?", options: [["invertercharger", "Inverter/charger"], ["inverteronly", "Inverter only"], ["none", "None"]] },
    { key: "waterHeater", label: "Water heater?", options: [["tank", "Tank"], ["tankless", "Tankless"]] },
    { key: "fridge", label: "Fridge?", options: [["absorption", "Propane"], ["residential", "Residential"]] },
    { key: "generator", label: "Generator?", options: [["builtin", "Built-in"], ["portable", "Portable"], ["none", "None"]] },
    { key: "genfuel", label: "Generator fuel?", options: [["gas", "Gas"], ["diesel", "Diesel"], ["propane", "Propane"]], showWhen: function (eq) { return eq.generator === "builtin" || eq.generator === "portable"; } },
    { key: "slides", label: "Slides?", options: [["yes", "Yes"], ["no", "No"]] },
    { key: "slidetype", label: "Slide mechanism?", options: [["schwintek", "Schwintek (in-wall)"], ["rackpinion", "Rack and pinion"], ["cable", "Cable"], ["hydraulic", "Hydraulic"], ["mixed", "More than one type"]], showWhen: function (eq) { return eq.slides === "yes"; } },
    { key: "suspension", label: "Suspension?", options: [["liquidspring", "Liquid Springs"], ["standard", "Standard"]] },
    { key: "truearth", label: "Tru-Earth Leveling?", options: [["yes", "Yes"], ["no", "No"]], showWhen: function (eq) { return eq.suspension === "liquidspring"; } },
    { key: "washerdryer", label: "Washer/dryer?", options: [["yes", "Yes"], ["no", "No"]] },
    { key: "icemaker", label: "Fridge ice maker?", options: [["yes", "Yes"], ["no", "No"]] },
    { key: "dishwasher", label: "Dishwasher?", options: [["yes", "Yes"], ["no", "No"]] },
    { key: "centralvac", label: "Central vacuum?", options: [["yes", "Yes"], ["no", "No"]] },
    { key: "sparetire", label: "Spare tire?", options: [["yes", "Yes"], ["no", "No"]] },
    { key: "slidetoppers", label: "Slide toppers?", options: [["yes", "Yes"], ["no", "No"]] },
    { key: "awning", label: "Awning?", options: [["power", "Power"], ["manual", "Manual"], ["none", "None"]] }
  ];
  /* Questions to show for this rig: the generator-fuel question only
     when the rig has a generator. Engine fuel (gas or diesel) lives on
     the rig form now, not in the poll (Nov 19: Rick). */
  function visibleQuestions(rig, eq) {
    return EQUIPMENT_QUESTIONS.filter(function (q) {
      if (q.showWhen && !q.showWhen(eq || {})) return false;
      return true;
    });
  }
  var ROOF_NOTES = {
    /* Rubber roofs come in two kinds (Nov 15: Rick — it matters).
       EPDM is the older black rubber: it chalks as it ages and
       petroleum-based products eat it, so only EPDM-safe sealant.
       TPO is the white membrane: tougher, stays white, no chalking.
       "rubber" is the old single answer — kept so a rig fitted
       before the split still gets a note. */
    epdm: "Walk the roof, look at every seam and vent, touch up cracked sealant with self-leveling sealant made for EPDM — never use petroleum-based products on it. Wash off the chalky residue when it shows.",
    tpo: "Walk the roof, look at every seam and vent, touch up cracked sealant with self-leveling sealant. TPO stays white and doesn't chalk like EPDM.",
    rubber: "Walk the roof, look at every seam and vent, touch up cracked sealant with self-leveling sealant.",
    fiberglass: "Walk the roof, check the seams and vents for cracks, touch up what is cracked.",
    aluminum: "Check the seams and rivets for leaks, touch up what is cracked."
  };
  var BATTERY_NOTES = {
    /* Only flooded batteries take water (Nov 15: Rick — the house
       battery type is an option). AGM and lithium never need topping
       up; they just want clean, tight connections. */
    flooded: "Top up with distilled water; clean the terminals.",
    agm: "No water to top up — just clean the terminals and check the connections.",
    lithium: "No water to top up — check the connections and the battery monitor."
  };
  /* next: what to open after the answers are saved (or skipped). No next
     means the usual-jobs list — the old path. The prebuilt-plan flow
     passes its own next, so the answers feed straight into the plan. */
  function openEquipmentSheet(next) {
    var rig = activeRig(); if (!rig) return;
    var draft = JSON.parse(JSON.stringify(rig.equipment || {}));
    function done() {
      closeSheet();
      if (typeof next === "function") next();
      else openStarterTasksSheet();
    }
    function draw() {
      // Gas or diesel only makes sense on a motorhome — a trailer has no engine.
      var qs = visibleQuestions(rig, draft);
      openSheet(
        sheetHead("What does your rig have?", qs.length + " quick questions — the usual jobs will only show the ones that fit your rig. Not sure is always a fine answer. Tap a chosen answer again to un-choose it.") +
        qs.map(function (q) {
          var opts = q.options.concat([["unsure", "Not sure"]]);
          return '<div class="field"><label>' + esc(q.label) + '</label><div class="btnrow">' +
            opts.map(function (o) {
              var sel = draft[q.key] === o[0];
              return '<button class="btn small ' + (sel ? "" : "ghost") + '" type="button" data-eq="' + q.key + '" data-val="' + o[0] + '">' + esc(o[1]) + '</button>';
            }).join("") + '</div></div>';
        }).join("") +
        '<div class="btnrow"><button class="btn block" id="eq-save" type="button">Fit the jobs to my rig</button></div>' +
        '<div class="btnrow"><button class="btn ghost block" id="eq-skip" type="button">Skip — show me every job</button></div>'
      );
      wireClose(sheetHost);
      $all("[data-eq]").forEach(function (b) {
        b.addEventListener("click", function () {
          var k = b.getAttribute("data-eq");
          var v = b.getAttribute("data-val");
          // Tap the chosen answer again to un-choose it (Nov 19: Rick —
          // "when you make a choice you're stuck with it"). Back to
          // unanswered, which never hides a job, same as Not sure.
          if (draft[k] === v) delete draft[k];
          else draft[k] = v;
          // No generator, no fuel to ask about — drop a stale fuel
          // answer so it can't gate jobs later. Same for the slide
          // mechanism when the rig has no slides, and for Tru-Earth
          // when the rig is no longer on Liquid Springs.
          if (k === "generator" && draft.generator !== "builtin" && draft.generator !== "portable") delete draft.genfuel;
          if (k === "slides" && draft.slides !== "yes") delete draft.slidetype;
          if (k === "suspension" && draft.suspension !== "liquidspring") delete draft.truearth;
          draw();
        });
      });
      $("#eq-save").addEventListener("click", function () {
        rig.equipment = draft; save(); done(); toast("The usual jobs now fit your rig.");
      });
      $("#eq-skip").addEventListener("click", done);
    }
    draw();
  }

  /* ---------------- navigation -------------------------------------------- */
  var currentScreen = "home";
  function showScreen(name) {
    currentScreen = name;
    $all(".screen").forEach(function (s) { s.classList.toggle("active", s.id === "screen-" + name); });
    $all("#tabbar .tab").forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-screen") === name); });
    if (name === "home") renderHome();
    if (name === "logbook") renderLogbook();
    if (name === "checklists") renderChecklists();
    if (name === "tires") renderTires();
    if (name === "parts") renderParts();
    if (name === "pros") renderPros();
    if (name === "storage") renderStorage();
    if (name === "fuel") renderFuel();
    if (name === "trips") renderTrips();
    if (name === "more") renderMore();
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* ---------------- Home --------------------------------------------------- */
  function renderHome() {
    var rig = activeRig();
    $("#home-year").textContent = new Date().getFullYear();
    if (!rig) { showScreen("setup"); return; }
    $("#home-rig-line").textContent = rigName(rig) + " · " + num(rig.mileage) + " mi · " + num(rig.genHours) + " gen hrs";
    $("#home-rig-art").innerHTML = rigArt(rig);
    $("#home-rig-photo-btn").textContent = rig.photo ? "📷 Change photo" : "📷 Add a photo of your rig";
    var open = dueTasks(rig).filter(function (d) { return d.status.level !== "done"; });
    var next = nextUpTasks(rig, 3);
    var list = $("#home-nextup");
    if (!next.length) {
      list.innerHTML = '<p class="muted">Nothing on the books — the rig is caught up.</p>';
    } else {
      list.innerHTML = next.map(function (d) {
        var dot = d.status.level === "overdue" ? "red" : d.status.level === "soon" ? "amber" : "green";
        return '<div class="row" data-task="' + d.task.id + '" style="cursor:pointer"><span class="dot ' + dot + '"></span><div class="grow"><div class="title">' + esc(d.task.title) + '</div>' +
          '<div class="sub">' + esc(d.task.category) + '</div></div>' +
          '<span class="pill ' + dot + '">' + esc(d.status.text) + '</span></div>';
      }).join("");
      $all("[data-task]", list).forEach(function (el) {
        el.addEventListener("click", function () { openTaskSheet(el.getAttribute("data-task")); });
      });
    }
    var more = $("#home-nextup-more");
    var rest = open.length - next.length;
    more.textContent = rest > 0 ? rest + " more on the books — in the Logbook." : "";
    more.onclick = rest > 0 ? function () { showScreen("logbook"); } : null;
    var toGet = partsForRig(rig.id).filter(function (p) { return !p.bought; });
    var ph = $("#home-parts");
    if (!toGet.length) {
      ph.innerHTML = '<p class="muted">Nothing on the list — add a part from a job, or just supplies.</p>';
    } else {
      ph.innerHTML = toGet.slice(0, 3).map(function (p) {
        var sub = [p.partNo, partTaskTitle(p)].filter(Boolean).join(" · ");
        return '<div class="row" data-part="' + p.id + '" style="cursor:pointer"><span class="dot green"></span><div class="grow"><div class="title">' + esc(p.name) + (p.qty > 1 ? ' ×' + p.qty : '') + '</div>' +
          '<div class="sub">' + esc(sub || "Supplies") + '</div></div></div>';
      }).join("");
      $all("[data-part]", ph).forEach(function (el) {
        el.addEventListener("click", function () { openPartSheet(el.getAttribute("data-part")); });
      });
    }
    var pm = $("#home-parts-more");
    pm.textContent = toGet.length > 3 ? (toGet.length - 3) + " more on the list — see the whole list." : (toGet.length ? "See the whole list." : "Open the list to add a part.");
    pm.onclick = function () { showScreen("parts"); };
    var fs = fuelStats(rig.id);
    var fh = $("#home-fuel");
    fh.innerHTML = fs.count ?
      '<div class="row"><div class="grow"><div class="title">' + (fs.mpg ? fs.mpg.toFixed(1) + ' MPG' : 'MPG coming') + '</div><div class="sub">' + fs.count + ' fill-up' + (fs.count === 1 ? '' : 's') + ' · ' + money(fs.spent) + ' on fuel</div></div></div>' :
      '<p class="muted">No fill-ups yet — log one and the MPG starts here.</p>';
    var fm = $("#home-fuel-more");
    fm.textContent = "Open the fuel log.";
    fm.onclick = function () { showScreen("fuel"); };
    var tr = tripsForRig(rig.id);
    var th = $("#home-trips");
    if (!tr.length) {
      th.innerHTML = '<p class="muted">No trips yet — plan the next one and the book keeps the miles and the money.</p>';
    } else {
      var latest = tr[0];
      var tc = tripCosts(latest);
      th.innerHTML = '<div class="row"><div class="grow"><div class="title">' + esc(latest.name || latest.destination || "Trip") + '</div>' +
        '<div class="sub">' + esc(fmtDate(latest.startDate)) + (latest.endDate ? ' – ' + esc(fmtDate(latest.endDate)) : '') + ' · ' + money(tc.total) + ' all in</div></div></div>';
    }
    var tm = $("#home-trips-more");
    tm.textContent = tr.length > 1 ? (tr.length - 1) + " more trip" + (tr.length === 2 ? "" : "s") + " — see them all." : "Open the trips.";
    tm.onclick = function () { showScreen("trips"); };
    $("#home-numbers").innerHTML =
      '<div class="row"><div class="grow"><div class="title">Odometer</div><div class="sub">Last updated in the book</div></div><b>' + num(rig.mileage) + ' mi</b></div>' +
      '<div class="row"><div class="grow"><div class="title">Generator hours</div><div class="sub">Hours on the generator</div></div><b>' + num(rig.genHours) + ' hrs</b></div>' +
      '<div class="row"><div class="grow"><div class="title">Tire pressures</div><div class="sub">Front / rear, per your placard</div></div><b>' + (rig.psiFront ? rig.psiFront + " / " + (rig.psiRear || "—") + " psi" : "Not set") + '</b></div>';
    var year = new Date().getFullYear();
    var c = costsForYear(rig.id, year);
    var cpm = costPerMile(rig);
    $("#home-spent").innerHTML =
      '<div class="big-number money">' + money(c.total) + '</div>' +
      '<p class="muted" style="margin:.2rem 0 0">' + (cpm ? money(cpm.perMile) + ' a mile over the last ' + num(cpm.miles) + ' miles' : 'all-in this year') + '</p>';
    renderHomeTip();
    renderHomeSearch();
  }

  /* ---------------- Did you know? (Home only) -------------------------------- */
  /* One tip at a time, in our own words. Next tip walks the list in order
     and wraps; Dismiss hides the card till tomorrow. */
  function tipIndex() {
    var i = (store.settings && store.settings.tipIndex) || 0;
    return TIPS.length ? ((i % TIPS.length) + TIPS.length) % TIPS.length : 0;
  }
  function renderHomeTip() {
    var card = $("#home-tip-card"); if (!card) return;
    if ((store.settings && store.settings.tipsDismissed) === todayISO()) { card.hidden = true; return; }
    card.hidden = false;
    $("#home-tip-text").textContent = TIPS[tipIndex()];
    $("#home-tip-next").onclick = function () {
      store.settings = store.settings || {};
      store.settings.tipIndex = tipIndex() + 1; save();
      $("#home-tip-text").textContent = TIPS[tipIndex()];
    };
    $("#home-tip-dismiss").onclick = function () {
      store.settings = store.settings || {};
      store.settings.tipsDismissed = todayISO(); save();
      card.hidden = true;
    };
  }

  /* ---------------- Home search ------------------------------------------- */
  /* Find a task by name or system, right from the Home screen — tap a
     result and its sheet opens, same as tapping it in the logbook. */
  var homeSearchQuery = "";
  var storageSearchQuery = "";
  function renderHomeSearch() {
    var host = $("#home-search-results");
    if (!host) return;
    if (!homeSearchQuery) { host.innerHTML = ""; return; }
    var rig = activeRig(); if (!rig) { host.innerHTML = ""; return; }
    var hits = dueTasks(rig).filter(function (d) {
      return d.status.level !== "done" &&
        (d.task.title + " " + d.task.category + " " + (d.task.note || "")).toLowerCase().indexOf(homeSearchQuery) !== -1;
    });
    if (!hits.length) {
      host.innerHTML = '<div class="card"><p class="muted">Nothing on the books matches "' + esc(homeSearchQuery) + '".</p></div>';
      return;
    }
    host.innerHTML = '<div class="card"><div class="page-head">Found in the book</div>' + hits.map(function (d) {
      var dot = d.status.level === "overdue" ? "red" : d.status.level === "soon" ? "amber" : "green";
      return '<div class="row" data-task="' + d.task.id + '" style="cursor:pointer"><span class="dot ' + dot + '"></span>' +
        '<div class="grow"><div class="title">' + esc(d.task.title) + '</div><div class="sub">' + esc(d.task.category) + '</div></div>' +
        '<span class="pill ' + dot + '">' + esc(d.status.text) + '</span></div>';
    }).join("") + "</div>";
    $all("[data-task]", host).forEach(function (el) {
      el.addEventListener("click", function () { openTaskSheet(el.getAttribute("data-task")); });
    });
  }

  /* ---------------- Logbook ------------------------------------------------ */
  /* How the "On the books" list is ordered — remembered per device. */
  var LOG_SORTS = ["due", "system", "name"];
  var logSort = "due";
  try {
    var savedSort = localStorage.getItem("rollonrv-logsort");
    if (LOG_SORTS.indexOf(savedSort) !== -1) logSort = savedSort;
  } catch (e) {}
  function sortOpenTasks(items, sortKey) {
    var list = items.slice();
    function byDate(a, b) {
      var da = a.task.nextDueDate || "9999", db = b.task.nextDueDate || "9999";
      if (da !== db) return da < db ? -1 : 1;
      var ma = a.task.nextDueMileage != null ? a.task.nextDueMileage : 999999999;
      var mb = b.task.nextDueMileage != null ? b.task.nextDueMileage : 999999999;
      return ma - mb;
    }
    function byTitle(a, b) {
      var ta = (a.task.title || "").toLowerCase(), tb = (b.task.title || "").toLowerCase();
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    }
    if (sortKey === "system") {
      list.sort(function (a, b) {
        var ca = (a.task.category || "").toLowerCase(), cb = (b.task.category || "").toLowerCase();
        if (ca !== cb) return ca < cb ? -1 : 1;
        return byTitle(a, b);
      });
    } else if (sortKey === "name") {
      list.sort(byTitle);
    } else {
      // Due soonest: overdue first by date, then the soonest due of the rest.
      var rank = { overdue: 0, soon: 1, ok: 2 };
      list.sort(function (a, b) {
        var r = (rank[a.status.level] != null ? rank[a.status.level] : 3) - (rank[b.status.level] != null ? rank[b.status.level] : 3);
        return r || byDate(a, b);
      });
    }
    return list;
  }
  function renderLogbook() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var host = $("#logbook-pages");
    var tasks = dueTasks(rig);
    var logs = store.logs.filter(function (l) { return l.rigId === rig.id; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var html = "";
    // Tasks still on the books, grouped by status
    var open = tasks.filter(function (d) { return d.status.level !== "done"; });
    if (open.length) {
      open = sortOpenTasks(open, logSort);
      var sortBtn = function (key, label) {
        return '<button class="btn small' + (logSort === key ? '' : ' ghost') + '" data-sort="' + key + '">' + label + '</button>';
      };
      var taskRow = function (d) {
        var dot = d.status.level === "overdue" ? "red" : d.status.level === "soon" ? "amber" : "green";
        return '<div class="row" data-task="' + d.task.id + '" style="cursor:pointer"><span class="dot ' + dot + '"></span>' +
          '<div class="grow"><div class="title">' + esc(d.task.title) + '</div><div class="sub">' + esc(d.task.category) + (d.task.needsPro ? ' · 🔧 Pro' : '') + (d.task.note ? ' · ' + esc(d.task.note) : '') + '</div></div>' +
          '<span class="pill ' + dot + '">' + esc(d.status.text) + '</span></div>';
      };
      var rowsHtml = "";
      if (logSort === "system") {
        // One named heading per system, so each group reads as a group.
        var currentGroup = null;
        open.forEach(function (d) {
          var g = d.task.category || "Other";
          if (g !== currentGroup) {
            currentGroup = g;
            var count = open.filter(function (x) { return (x.task.category || "Other") === currentGroup; }).length;
            rowsHtml += '<div class="group-head">' + esc(currentGroup) + ' · ' + count + '</div>';
          }
          rowsHtml += taskRow(d);
        });
      } else {
        rowsHtml = open.map(taskRow).join("");
      }
      html += '<div class="page"><div class="page-head">On the books</div>' +
        '<div class="sortrow"><span class="muted small">Sort:</span>' + sortBtn("due", "Due soonest") + sortBtn("system", "System") + sortBtn("name", "Name") + '</div>' +
        rowsHtml + "</div>";
    }
    // Completed entries, grouped by month, ruled pages
    var byMonth = {};
    logs.forEach(function (l) { var k = l.date.slice(0, 7); (byMonth[k] = byMonth[k] || []).push(l); });
    var months = Object.keys(byMonth).sort().reverse();
    if (!months.length) {
      html += '<div class="page"><div class="page-head">The book is empty</div>' +
        '<p class="muted">Nothing written yet. Log your first job — snap the receipt, write what it cost, stamp it done.</p></div>';
    }
    months.forEach(function (m) {
      var entries = byMonth[m];
      var total = entries.reduce(function (s, l) { return s + (Number(l.cost) || 0); }, 0);
      html += '<div class="page ruled"><div class="page-head">' + esc(fmtMonthYear(m + "-01")) + '</div>' +
        entries.map(function (l) {
          return '<div class="entry" data-log="' + l.id + '">' +
            '<div style="display:flex;justify-content:space-between;gap:.6rem;align-items:baseline">' +
            '<span class="date">' + esc(fmtDate(l.date)) + '</span>' +
            '<span class="cost money">' + (l.cost ? money(l.cost) : "—") + '</span></div>' +
            '<div class="job">' + esc(l.title) + '</div>' +
            '<div class="meta">' + [l.mileage != null ? num(l.mileage) + " mi" : null, l.genHours != null ? num(l.genHours) + " gen hrs" : null, l.note ? esc(l.note) : null].filter(Boolean).join(" · ") + '</div>' +
            (l.photos && l.photos.length ? '<div class="thumbs">' + l.photos.slice(0, 3).map(function (p) { return '<img src="' + esc(p.data) + '" alt="Job photo" />'; }).join("") + '</div>' : "") +
            '<div style="margin-top:.35rem"><span class="stamp">Done</span></div></div>';
        }).join("") +
        '<p class="muted" style="margin:.7rem 0 0">Spent in ' + esc(fmtMonthYear(m + "-01")) + ' · <b class="money">' + money(total) + '</b></p></div>';
    });
    host.innerHTML = html;
    $all("[data-sort]", host).forEach(function (el) {
      el.addEventListener("click", function () {
        logSort = el.getAttribute("data-sort");
        try { localStorage.setItem("rollonrv-logsort", logSort); } catch (e) {}
        renderLogbook();
      });
    });
    $all("[data-task]", host).forEach(function (el) {
      el.addEventListener("click", function () { openTaskSheet(el.getAttribute("data-task")); });
    });
    $all("[data-log]", host).forEach(function (el) {
      el.addEventListener("click", function () { openLogSheet(el.getAttribute("data-log")); });
    });
  }

  /* ---------------- Checklists --------------------------------------------- */
  function renderChecklists() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var picker = $("#checklist-picker"), runHost = $("#checklist-run");
    var armedList = null; /* first tap on a list's × only arms it — second tap deletes */
    var lists = CHECKLISTS.concat(customListsFor(rig.id).map(function (l) { return findChecklist(l.id, rig.id); }));
    picker.innerHTML = '<div class="btnrow" style="padding:0 .2rem"><button class="btn ghost block" id="add-custom-list-btn" type="button">＋ Add a custom group</button></div>' +
      lists.map(function (tpl) {
        var run = activeRun(tpl.id);
        var done = run ? runCheckedCount(run, tpl, rig.id) : 0, total = checklistTotal(tpl, rig.id);
        var pct = total ? Math.round(done / total * 100) : 0;
        /* The run you finished most recently — later starts win a same-day tie. */
        var lastFinished = null;
        store.runs.forEach(function (r) {
          if (r.templateId === tpl.id && r.finishedAt && (!lastFinished || r.finishedAt >= lastFinished.finishedAt)) lastFinished = r;
        });
        var lastProofs = lastFinished ? proofsOf(lastFinished) : [];
        return '<div class="card"><div class="card-head"><h2>' + esc(tpl.name) + '</h2>' +
          (tpl.custom ? '<button class="custom-del' + (armedList === tpl.id ? ' armed' : '') + '" data-del-list="' + tpl.id + '" aria-label="Remove this list">' + (armedList === tpl.id ? 'Delete?' : '×') + '</button>' : '') + '</div>' +
          '<p class="muted">' + esc(tpl.sub) + ' · ' + total + ' items</p>' +
          (run ? '<div class="progress"><div style="width:' + pct + '%"></div></div><p class="small" style="margin:.4rem 0 0">' + done + ' of ' + total + ' checked — started ' + esc(fmtDate(run.startedAt)) + '</p>' : '') +
          (lastFinished ? '<div class="small" style="margin:.4rem 0 0;cursor:pointer" data-open-finished="' + tpl.id + '|' + lastFinished.id + '">✓ Finished ' + esc(fmtDate(lastFinished.finishedAt)) + (lastProofs.length ? ' · 📷 ' + (lastProofs.length === 1 ? 'proof taken ' + esc(fmtDate(lastProofs[0].takenAt || lastFinished.finishedAt)) : lastProofs.length + ' photos') : ' · no photo yet') + '</div>' +
            (lastProofs.length ? '<div class="thumbs">' + lastProofs.slice(0, 3).map(function (p) { return '<img src="' + esc(p.data) + '" alt="Photo proof" />'; }).join("") + '</div>' : '') : '') +
          '<div class="btnrow"><button class="btn" data-start="' + tpl.id + '">' + (run ? 'Keep going' : 'Start') + '</button>' +
          (run ? '<button class="btn ghost" data-restart="' + tpl.id + '">Start over</button>' : '') + '</div></div>';
      }).join("");
    $("#add-custom-list-btn", picker).addEventListener("click", openCustomListSheet);
    $all("[data-del-list]", picker).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-del-list");
        if (armedList !== id) { armedList = id; b.textContent = "Delete?"; b.classList.add("armed"); return; }
        store.customLists = (store.customLists || []).filter(function (l) { return l.id !== id; });
        store.customItems = (store.customItems || []).filter(function (c) { return c.templateId !== id; });
        store.customGroups = (store.customGroups || []).filter(function (g) { return g.templateId !== id; });
        store.customHeadings = (store.customHeadings || []).filter(function (h) { return h.templateId !== id; });
        store.removedItems = (store.removedItems || []).filter(function (r) { return r.templateId !== id; });
        store.runs = store.runs.filter(function (r) { return r.templateId !== id; });
        armedList = null; save(); renderChecklists(); toast("List removed.");
      });
    });
    $all("[data-start]", picker).forEach(function (b) {
      b.addEventListener("click", function () { openChecklistRun(b.getAttribute("data-start")); });
    });
    $all("[data-open-finished]", picker).forEach(function (el) {
      el.addEventListener("click", function () {
        var parts = el.getAttribute("data-open-finished").split("|");
        openChecklistRun(parts[0], parts[1]);
      });
    });
    $all("[data-restart]", picker).forEach(function (b) {
      b.addEventListener("click", function () {
        var run = activeRun(b.getAttribute("data-restart"));
        if (run) { run.checks = {}; run.proofs = []; delete run.proof; delete run.proofAt; save(); }
        openChecklistRun(b.getAttribute("data-restart"));
      });
    });
    runHost.hidden = true; runHost.innerHTML = "";
    picker.hidden = false;
  }
  /* Sheet for naming a new custom group — a whole checklist of his own. */
  function openCustomListSheet() {
    var rig = activeRig();
    openSheet(
      sheetHead("Add a custom group", "A checklist of your own — name it, then tap Start to fill it in.") +
      '<div class="field"><label for="cl-name">Group name</label><input id="cl-name" type="text" placeholder="e.g. Grandkids\u2019 gear" maxlength="60" autocomplete="off" /></div>' +
      '<div class="btnrow"><button class="btn block" id="cl-create" type="button">Create group</button></div>'
    );
    wireClose(sheetHost);
    var input = $("#cl-name");
    function createList() {
      var name = input.value.trim();
      if (!name) { toast("Give the group a name first."); return; }
      store.customLists.push({ id: uid(), rigId: rig.id, name: name });
      save(); closeSheet(); renderChecklists(); toast("Group added — tap Start to fill it in.");
    }
    $("#cl-create").addEventListener("click", createList);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); createList(); } });
    input.focus();
  }
  function openChecklistRun(templateId, runId) {
    var rig = activeRig(); var tpl = findChecklist(templateId, rig.id);
    if (!tpl) return;
    /* Reopening a finished run (from the picker's finished line) so a
       photo can be added later; otherwise the run in progress, or a new one. */
    var run = runId ? (store.runs.find(function (r) { return r.id === runId; }) || null) : null;
    if (!run) run = activeRun(templateId) || startRun(templateId, rig.id);
    var picker = $("#checklist-picker"), host = $("#checklist-run");
    var armedDel = null; /* first tap on × only arms it — second tap deletes */
    var armedGroup = null; /* same deal for a whole custom group */
    var armedBuiltin = null; /* same deal for a built-in line */
    picker.hidden = true; host.hidden = false;
    /* Takes a custom item back off, whether it lives in a named group or
       in the flat "Your own items" list. */
    function removeCustomItem(id) {
      var found = false;
      (store.customGroups || []).forEach(function (g) {
        var i = g.items.findIndex(function (it) { return it.id === id; });
        if (i !== -1) { g.items.splice(i, 1); found = true; }
      });
      if (!found) store.customItems = store.customItems.filter(function (c) { return c.id !== id; });
      delete run.checks[id];
    }
    /* Your own words can change — tap them and fix the wording. The
       check stays as it is; built-in lines never change. */
    function openCustomItemSheet(id) {
      var item = null, where = null;
      (store.customItems || []).forEach(function (c) { if (c.id === id) { item = c; where = "flat"; } });
      if (!item) (store.customGroups || []).forEach(function (g) {
        g.items.forEach(function (it) { if (it.id === id) { item = it; where = g.name; } });
      });
      if (!item) return;
      openSheet(
        sheetHead("One item", where === "flat" ? "Your own item — change the words." : "Your own item, in " + where + " — change the words.") +
        '<div class="field"><label for="ci-label">The words</label><input id="ci-label" value="' + esc(item.label) + '" maxlength="120" /></div>' +
        '<div class="btnrow"><button class="btn block" id="ci-save" type="button">Save the words</button></div>' +
        '<div class="btnrow"><button class="btn ghost block" id="ci-delete" type="button">Take it off the list</button></div>'
      );
      wireClose(sheetHost);
      $("#ci-save").addEventListener("click", function () {
        var label = $("#ci-label").value.trim();
        if (!label) { toast("Give the item some words first."); return; }
        item.label = label;
        save(); closeSheet(); draw(); toast("Words changed.");
      });
      $("#ci-delete").addEventListener("click", function () {
        if (!confirm("Take this item off the list?")) return;
        removeCustomItem(id); save(); closeSheet(); draw();
      });
    }
    /* The heading over your own items is yours too — tap it and give
       that group a name of your own. It prints under the new name. */
    function openCustomHeadingSheet() {
      var current = customHeadingFor(rig.id, tpl.id);
      openSheet(
        sheetHead("That heading", "Give this group of your own items a name.") +
        '<div class="field"><label for="ch-label">The heading</label><input id="ch-label" value="' + esc(current) + '" maxlength="60" /></div>' +
        '<div class="btnrow"><button class="btn block" id="ch-save" type="button">Save the heading</button></div>' +
        '<div class="btnrow"><button class="btn ghost block" id="ch-reset" type="button">Back to "Your own items"</button></div>'
      );
      wireClose(sheetHost);
      $("#ch-save").addEventListener("click", function () {
        var label = $("#ch-label").value.trim();
        if (!label) { toast("Give the heading some words first."); return; }
        setCustomHeading(rig.id, tpl.id, label);
        save(); closeSheet(); draw(); toast("Heading changed.");
      });
      $("#ch-reset").addEventListener("click", function () {
        store.customHeadings = (store.customHeadings || []).filter(function (x) { return !(x.rigId === rig.id && x.templateId === tpl.id); });
        save(); closeSheet(); draw(); toast("Heading back to \"Your own items\".");
      });
    }
    function draw() {
      var customs = customItemsFor(rig.id, tpl.id);
      var groups = customGroupsFor(rig.id, tpl.id);
      var done = runCheckedCount(run, tpl, rig.id), total = checklistTotal(tpl, rig.id);
      var pct = total ? Math.round(done / total * 100) : 0;
      var html = '<div class="card"><h2>' + esc(tpl.name) + '</h2>' +
        '<p class="muted">' + done + ' of ' + total + ' checked</p>' +
        '<div class="progress"><div style="width:' + pct + '%"></div></div>';
      tpl.groups.forEach(function (g) {
        html += '<div class="check-group">' + esc(g.name) + '</div>';
        g.items.forEach(function (it) {
          if (isItemRemoved(rig.id, tpl.id, it.id)) return;
          var psi = "";
          if (it.psi && rig) psi = '<div class="psi">' + (rig.psiFront ? rig.psiFront + " psi front" : "") + (rig.psiFront && rig.psiRear ? " · " : "") + (rig.psiRear ? rig.psiRear + " psi rear" : "") + '</div>';
          html += '<div class="custom-row"><button class="check-item' + (run.checks[it.id] ? ' done' : '') + '" data-item="' + it.id + '">' +
            '<span class="box">' + (run.checks[it.id] ? "✓" : "") + '</span>' +
            '<span><span class="label">' + esc(it.label) + '</span>' + psi + '</span></button>' +
            '<button class="custom-del' + (armedBuiltin === it.id ? ' armed' : '') + '" data-del-builtin="' + it.id + '" aria-label="Take this item off the list">' + (armedBuiltin === it.id ? 'Delete?' : '×') + '</button></div>';
        });
      });
      /* Lines taken off this list — tap Put back and the line is on the
         list again. Things change: a rig gains a toad, or loses one. */
      var removed = removedItemsFor(rig.id, tpl.id).map(function (r) { return r.itemId; }).filter(function (id) { return builtInLabel(tpl, id); });
      if (removed.length) {
        html += '<div class="check-group">Taken off this list</div>' +
          '<p class="small muted">Changed your mind? Tap Put back and the line is on the list again.</p>';
        removed.forEach(function (id) {
          html += '<div class="custom-row"><span class="label muted" style="flex:1;padding:.55rem 0">' + esc(builtInLabel(tpl, id)) + '</span>' +
            '<button class="btn small ghost" data-restore-builtin="' + id + '" type="button">Put back</button></div>';
        });
      }
      if (customs.length) {
        html += '<button class="check-group heading-edit" type="button" data-edit-heading>' + esc(customHeadingFor(rig.id, tpl.id)) + ' <span class="edit-hint">✎</span></button>';
        customs.forEach(function (c) {
          html += '<div class="custom-row"><button class="check-item' + (run.checks[c.id] ? ' done' : '') + '" data-item="' + c.id + '">' +
            '<span class="box">' + (run.checks[c.id] ? "✓" : "") + '</span>' +
            '<span><span class="label" data-edit-custom="' + c.id + '">' + esc(c.label) + ' <span class="edit-hint">✎</span></span></span></button>' +
            '<button class="custom-del' + (armedDel === c.id ? ' armed' : '') + '" data-del-custom="' + c.id + '" aria-label="Take this item off the list">' + (armedDel === c.id ? 'Delete?' : '×') + '</button></div>';
        });
      }
      html += '<div class="add-custom"><input id="custom-item-input" type="text" placeholder="Add your own item" maxlength="120" autocomplete="off" />' +
        '<button class="btn" id="custom-item-add" type="button">Add item</button></div>';
      groups.forEach(function (g) {
        html += '<div class="custom-group-head"><span class="check-group">' + esc(g.name) + '</span>' +
          '<button class="custom-del' + (armedGroup === g.id ? ' armed' : '') + '" data-del-group="' + g.id + '" aria-label="Remove this group">' + (armedGroup === g.id ? 'Delete?' : '×') + '</button></div>';
        g.items.forEach(function (it) {
          html += '<div class="custom-row"><button class="check-item' + (run.checks[it.id] ? ' done' : '') + '" data-item="' + it.id + '">' +
            '<span class="box">' + (run.checks[it.id] ? "✓" : "") + '</span>' +
            '<span><span class="label" data-edit-custom="' + it.id + '">' + esc(it.label) + ' <span class="edit-hint">✎</span></span></span></button>' +
            '<button class="custom-del' + (armedDel === it.id ? ' armed' : '') + '" data-del-custom="' + it.id + '" aria-label="Take this item off the list">' + (armedDel === it.id ? 'Delete?' : '×') + '</button></div>';
        });
        html += '<div class="add-custom"><input data-group-input="' + g.id + '" type="text" placeholder="Add an item to ' + esc(g.name) + '" maxlength="120" autocomplete="off" />' +
          '<button class="btn" data-group-add="' + g.id + '" type="button">Add item</button></div>';
      });
      var proofs = proofsOf(run);
      html += '<div class="check-group">Photo proof</div>' +
        '<p class="small muted">Snap the finished sheet, or the work itself — it rides along with this run, for warranty claims and your own records.</p>';
      if (proofs.length) {
        html += '<div class="thumbs">' + proofs.map(function (p) {
          return '<span style="position:relative"><img src="' + esc(p.data) + '" alt="Photo proof" />' +
            '<button type="button" data-del-proof="' + p.id + '" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:none;border-radius:50%;width:1.4rem;height:1.4rem;font-weight:700" aria-label="Remove this photo">×</button></span>';
        }).join("") + '</div>' +
          '<p class="small muted">Taken ' + esc(fmtDate(proofs[proofs.length - 1].takenAt || run.finishedAt)) + ' — the date the photo was taken, with the run.</p>';
      }
      html += '<div class="btnrow"><button class="btn ghost block" id="run-proof-add">📷 ' + (proofs.length ? 'Add another photo' : 'Add a photo — proof for this run') + '</button></div>';
      html += '<div class="btnrow"><button class="btn block" id="run-finish">' + (done === total ? 'Stamp it done' : 'Done for now') + '</button>' +
        '<button class="btn ghost block" id="run-print">🖨 Print this list</button>' +
        '<button class="btn ghost block" id="run-back">Back to checklists</button></div>';
      if (done === total) html += '<p style="text-align:center;margin-top:1rem"><span class="stamp big pop">Done</span></p>';
      html += '</div>';
      host.innerHTML = html;
      $all("[data-item]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-item");
          armedDel = null; armedGroup = null; armedBuiltin = null; run.checks[id] = !run.checks[id]; save(); draw();
        });
      });
      /* Tap the words themselves to change them — the tap never reaches
         the row, so the check stays as it is. */
      $all("[data-edit-custom]", host).forEach(function (el) {
        el.addEventListener("click", function (e) {
          e.stopPropagation();
          armedDel = null; armedGroup = null;
          openCustomItemSheet(el.getAttribute("data-edit-custom"));
        });
      });
      /* The heading over your own items is yours too. */
      $all("[data-edit-heading]", host).forEach(function (el) {
        el.addEventListener("click", function () {
          armedDel = null; armedGroup = null;
          openCustomHeadingSheet();
        });
      });
      $all("[data-del-builtin]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-del-builtin");
          if (armedBuiltin !== id) { armedBuiltin = id; armedDel = null; armedGroup = null; draw(); return; }
          removeBuiltInItem(rig.id, tpl.id, id);
          delete run.checks[id];
          armedBuiltin = null; save(); draw(); toast("Item taken off the list — put it back any time.");
        });
      });
      $all("[data-restore-builtin]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-restore-builtin");
          restoreBuiltInItem(rig.id, tpl.id, id);
          armedDel = null; armedGroup = null; armedBuiltin = null; save(); draw(); toast("Back on the list.");
        });
      });
      $all("[data-del-custom]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-del-custom");
          if (armedDel !== id) { armedDel = id; armedGroup = null; draw(); return; }
          removeCustomItem(id); armedDel = null; save(); draw(); toast("Item taken off the list.");
        });
      });
      $all("[data-del-group]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-del-group");
          if (armedGroup !== id) { armedGroup = id; armedDel = null; draw(); return; }
          var g = (store.customGroups || []).find(function (x) { return x.id === id; });
          if (g) g.items.forEach(function (it) { delete run.checks[it.id]; });
          store.customGroups = store.customGroups.filter(function (x) { return x.id !== id; });
          armedGroup = null; save(); draw(); toast("Group removed.");
        });
      });
      $all("[data-group-add]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var gid = b.getAttribute("data-group-add");
          var inputEl = host.querySelector('[data-group-input="' + gid + '"]');
          var label = inputEl.value.trim();
          if (!label) return;
          var g = (store.customGroups || []).find(function (x) { return x.id === gid; });
          if (!g) return;
          armedDel = null; armedGroup = null;
          g.items.push({ id: uid(), label: label });
          save(); draw(); toast("Added to " + g.name + ".");
        });
      });
      $all("[data-group-input]", host).forEach(function (inp) {
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); host.querySelector('[data-group-add="' + inp.getAttribute("data-group-input") + '"]').click(); }
        });
      });
      var input = $("#custom-item-input", host);
      function addCustom() {
        var label = input.value.trim();
        if (!label) return;
        armedDel = null; armedGroup = null;
        store.customItems.push({ id: uid(), rigId: rig.id, templateId: tpl.id, label: label });
        save(); draw(); toast("Added to this checklist.");
      }
      $("#custom-item-add", host).addEventListener("click", addCustom);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addCustom(); } });
      $("#run-finish").addEventListener("click", function () {
        run.finishedAt = todayISO(); save(); renderChecklists(); try { window.scrollTo(0, 0); } catch (e) {} toast("Checklist finished — nice and done.");
      });
      function addProof() {
        /* One picker session can hand over several photos now (Nov 15:
           the picker only ever offered one). Each is downscaled and
           added in turn; the run caps at 12, like log entries. */
        if (proofsOf(run).length >= MAX_PHOTOS_PER_LOG) { toast("That's enough photos for one run — 12 is the limit."); return; }
        requestPhoto(function (urls) {
          var i = 0, added = 0, stopped = false;
          function finish() { if (added) { save(); draw(); } }
          (function next() {
            if (stopped || i >= urls.length) { finish(); return; }
            var url = urls[i++];
            downscalePhoto(url).then(function (small) {
              if (proofsOf(run).length >= MAX_PHOTOS_PER_LOG) { toast("That's enough photos for one run — 12 is the limit."); stopped = true; finish(); return; }
              if (!storeHasRoom(small.length)) { toast("The book is nearly full — export a copy before adding more photos."); stopped = true; finish(); return; }
              proofsOf(run).push({ id: uid(), data: small, takenAt: todayISO() }); added++;
              next();
            });
          })();
        });
      }
      var proofAdd = $("#run-proof-add", host);
      if (proofAdd) proofAdd.addEventListener("click", addProof);
      $all("[data-del-proof]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var id = b.getAttribute("data-del-proof");
          run.proofs = proofsOf(run).filter(function (p) { return p.id !== id; }); save(); draw();
        });
      });
      $("#run-print").addEventListener("click", function () { printChecklistRun(tpl, run, rig); });
      $("#run-back").addEventListener("click", function () { save(); renderChecklists(); try { window.scrollTo(0, 0); } catch (e) {} });
    }
    draw();
    /* A list always opens at the top (Nov 16: Rick — after stamping one
       list done, the next one opened at the bottom of the screen). */
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* ---------------- Tires --------------------------------------------------- */
  function renderTires() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var host = $("#tire-list");
    var tires = store.tires.filter(function (t) { return t.rigId === rig.id; });
    if (!tires.length) {
      host.innerHTML = '<div class="card"><div class="empty"><span class="hand">No tires in the book yet.</span>Add each tire with its DOT code — the last four digits on the sidewall — and the book will watch its birthday.</div></div>';
      return;
    }
    host.innerHTML = tires.map(function (t) {
      var info = dotInfo(t.dotCode);
      var cls = info.ok ? (info.flag === "good" ? "green" : info.flag === "old" ? "amber" : "red") : "amber";
      var pill = info.ok ? (info.flag === "good" ? "Good" : info.flag === "old" ? "Getting old" : "Replace") : "Check code";
      return '<div class="card" data-tire="' + t.id + '" style="cursor:pointer">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:.6rem">' +
        '<h2 style="margin:0">' + esc(t.position || "Tire") + '</h2><span class="pill ' + cls + '">' + pill + '</span></div>' +
        '<div class="age">' + (info.ok ? esc(info.ageText) : "—") + '</div>' +
        '<p class="muted" style="margin:.2rem 0">DOT ···· ' + esc(String(t.dotCode || "").replace(/\D/g, "").slice(-4)) +
        (info.ok && info.madeText ? ' — ' + esc(info.madeText) : '') + '</p>' +
        (info.ok ? '<div class="tire-bar"><div class="' + cls + '" style="width:' + info.pctToTen + '%"></div></div>' +
        '<p class="small muted">The bar fills toward 10 years — the hard limit.</p>' : '') +
        '<p>' + esc(info.ok ? info.flagText : info.text) + '</p>' +
        (t.note ? '<p class="small muted">' + esc(t.note) + '</p>' : '') + '</div>';
    }).join("");
    $all("[data-tire]", host).forEach(function (el) {
      el.addEventListener("click", function () { openTireSheet(el.getAttribute("data-tire")); });
    });
  }

  /* ---------------- More: costs, rig, CSV ---------------------------------- */
  /* ---------------- Parts to get (the shopping list — free) ----------------- */
  /* The list lives in the app; print it for the counter, or download it
     as a CSV. Tap the box when you've got it; tap the line to change it
     or add what you paid. */
  function renderParts() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var all = partsForRig(rig.id);
    var toGet = all.filter(function (p) { return !p.bought; });
    var got = all.filter(function (p) { return p.bought; });
    function rowHtml(p) {
      var sub = [p.partNo, partTaskTitle(p)].filter(Boolean).join(" · ");
      return '<div class="check-item' + (p.bought ? ' done' : '') + '">' +
        '<button class="box" data-toggle-part="' + p.id + '" type="button" aria-label="Got it">' + (p.bought ? "✓" : "") + '</button>' +
        '<span class="label" data-open-part="' + p.id + '" style="cursor:pointer"><b>' + esc(p.name) + '</b>' + (p.qty > 1 ? ' ×' + p.qty : '') +
        (sub ? '<br><span class="psi">' + esc(sub) + '</span>' : '') +
        (p.bought && p.boughtCost ? '<br><span class="psi">' + esc(money(p.boughtCost)) + ' · ' + esc(fmtDate(p.boughtAt)) + '</span>' : '') +
        '</span></div>';
    }
    $("#parts-list").innerHTML =
      (toGet.length ? '<div class="check-group">To get</div>' + toGet.map(rowHtml).join("") : '<p class="muted">Nothing on the list — add a part from a job, or just supplies.</p>') +
      (got.length ? '<div class="check-group">Already got</div>' + got.map(rowHtml).join("") : "") +
      '<p class="small muted">Tap a line to change it or add what you paid — it lands in what she\'s cost. Tap the box when you\'ve got it.</p>';
    $all("[data-toggle-part]", $("#parts-list")).forEach(function (b) {
      b.addEventListener("click", function () {
        var part = (store.parts || []).find(function (p) { return p.id === b.getAttribute("data-toggle-part"); });
        if (!part) return;
        togglePartBought(part); renderParts(); renderHome();
      });
    });
    $all("[data-open-part]", $("#parts-list")).forEach(function (el) {
      el.addEventListener("click", function () { openPartSheet(el.getAttribute("data-open-part")); });
    });
  }

  /* ---------------- My pros ------------------------------------------------- */
  function renderPros() {
    var pros = store.pros || [];
    $("#pros-list").innerHTML = pros.length ? pros.map(function (p) {
      var sub = [p.specialty, p.town].filter(Boolean).join(" · ");
      return '<div class="row" data-open-pro="' + p.id + '" style="cursor:pointer"><div class="grow"><div class="title">' + esc(p.name) + '</div>' +
        (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>' +
        (p.phone ? '<a class="btn small" href="tel:' + esc(p.phone.replace(/[^0-9+*#]/g, "")) + '">📞 ' + esc(p.phone) + '</a>' : '<span class="muted small">No number yet</span>') + '</div>';
    }).join("") + '<p class="small muted">Tap a line to change it. Tap the number to call.</p>'
      : '<p class="muted">No pros yet — add the first shop you trust, and it will be there when a job belongs to them.</p>';
    $all("[data-open-pro]").forEach(function (el) {
      el.addEventListener("click", function (e) { if (e.target.closest("a")) return; openProSheet(el.getAttribute("data-open-pro")); });
    });
  }
  function openProSheet(proId) {
    var pro = proId ? (store.pros || []).find(function (p) { return p.id === proId; }) : null;
    var draft = pro ? JSON.parse(JSON.stringify(pro)) : newPro({});
    openSheet(
      sheetHead(pro ? "One pro" : "Add a pro", "Name, what they do, and a number to call. It joins your list for every job.") +
      '<div class="field"><label for="pr-name">Name</label><input id="pr-name" value="' + esc(draft.name) + '" placeholder="e.g. Bob\'s RV Service" /></div>' +
      '<div class="field"><label for="pr-specialty">What they do (optional)</label><input id="pr-specialty" value="' + esc(draft.specialty) + '" placeholder="e.g. Suspension, roof, slideouts" /></div>' +
      '<div class="field"><label for="pr-phone">Phone (optional)</label><input id="pr-phone" inputmode="tel" value="' + esc(draft.phone) + '" placeholder="e.g. (850) 555-0134" /></div>' +
      '<div class="field"><label for="pr-town">Town (optional)</label><input id="pr-town" value="' + esc(draft.town) + '" placeholder="e.g. Panama City" /></div>' +
      '<div class="btnrow"><button class="btn block" id="pr-save" type="button">Save this pro</button></div>' +
      (pro ? '<div class="btnrow"><button class="btn ghost block" id="pr-delete" type="button">Delete this pro</button></div>' : '')
    );
    wireClose(sheetHost);
    $("#pr-save").addEventListener("click", function () {
      var name = $("#pr-name").value.trim();
      if (!name) { toast("Give the pro a name first."); return; }
      draft.name = name; draft.specialty = $("#pr-specialty").value.trim(); draft.phone = $("#pr-phone").value.trim(); draft.town = $("#pr-town").value.trim();
      if (!pro) { store.pros = store.pros || []; store.pros.push(draft); }
      else { var i = store.pros.findIndex(function (p) { return p.id === pro.id; }); if (i >= 0) store.pros[i] = draft; }
      save(); closeSheet(); renderPros(); toast("Saved to your pros.");
    });
    if (pro) $("#pr-delete").addEventListener("click", function () {
      if (!confirm("Delete " + pro.name + " from your pros? Jobs that named them keep the name, but the number goes with them.")) return;
      store.pros = store.pros.filter(function (p) { return p.id !== pro.id; });
      store.tasks.forEach(function (t) { if (t.proId === pro.id) t.proId = null; });
      save(); closeSheet(); renderPros();
    });
  }

  /* ---------------- Find it (storage) --------------------------------------- */
  /* Where's my stuff? The rig's basement bays, named your way, with every
     thing in its bay — search finds it instead of opening every door.
     Bays and things live on the rig, so they ride along if the book ever
     holds a second rig. Free core: no cost, no warranty, no purchase
     info here — that stays with Pro parts tracking. Starters are a
     guess at the usual bays for the rig type; rename, add, or take out
     any of them. A bay that still holds things can't be taken out until
     they're moved — nothing gets lost by accident. */
  var STORAGE_STARTERS_MOTORIZED = ["Driver front bay", "Driver mid bay", "Driver rear bay", "Passenger front bay", "Passenger mid bay", "Passenger rear bay", "Wet bay"];
  var STORAGE_STARTERS_TRAILER = ["Front pass-through", "Rear storage", "Wet bay", "Under-bed storage"];
  function storageStarterCompartments(rig) {
    var t = rig ? rig.type : "Class A";
    return (t === "Class A" || t === "Class B" || t === "Class C") ? STORAGE_STARTERS_MOTORIZED.slice() : STORAGE_STARTERS_TRAILER.slice();
  }
  function storageFor(rig) {
    if (!rig.storage || !Array.isArray(rig.storage.compartments)) {
      rig.storage = { compartments: storageStarterCompartments(rig).map(function (name) { return { id: uid(), name: name }; }), items: [] };
    }
    if (!Array.isArray(rig.storage.items)) rig.storage.items = [];
    return rig.storage;
  }
  function storageCompartmentName(rig, compartmentId) {
    var st = storageFor(rig);
    var c = st.compartments.find(function (x) { return x.id === compartmentId; });
    return c ? c.name : "";
  }
  function storageSearch(rig, q) {
    var query = (q || "").trim().toLowerCase();
    if (!query) return [];
    var st = storageFor(rig);
    return st.items.filter(function (it) { return it.name.toLowerCase().indexOf(query) !== -1; }).map(function (it) {
      return { item: it, compartment: storageCompartmentName(rig, it.compartmentId) };
    });
  }
  function renderStorage() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var st = storageFor(rig);
    var q = storageSearchQuery;
    var searchBox = $("#storage-search");
    if (searchBox && searchBox.value !== q) searchBox.value = q;
    var host = $("#storage-list");
    if (q) {
      var hits = storageSearch(rig, q);
      host.innerHTML = hits.length ? '<div class="check-group">Found in your bays</div>' + hits.map(function (h) {
        return '<div class="row" data-open-stored="' + h.item.id + '" style="cursor:pointer"><div class="grow"><div class="title">' + esc(h.item.name) + '</div>' +
          '<div class="sub">' + esc(h.compartment || "No bay yet") + '</div></div></div>';
      }).join("") + '<p class="small muted">Tap a line to move it to another bay or take it out.</p>'
        : '<p class="muted">Nothing named "' + esc(q) + '" is in your bays yet — add it with ＋ Add a thing.</p>';
    } else {
      host.innerHTML = st.compartments.map(function (c) {
        var items = st.items.filter(function (it) { return it.compartmentId === c.id; });
        return '<div class="check-group" data-bay="' + c.id + '"><span data-open-bay="' + c.id + '" style="cursor:pointer">' + esc(c.name) + '</span>' +
          ' <span class="muted small">· ' + items.length + (items.length === 1 ? ' thing' : ' things') + '</span></div>' +
          (items.length ? items.map(function (it) {
            return '<div class="row" data-open-stored="' + it.id + '" style="cursor:pointer"><div class="grow"><div class="title">' + esc(it.name) + '</div></div></div>';
          }).join("") : '<p class="muted small">Nothing in this bay yet.</p>');
      }).join("") + '<p class="small muted">Tap a bay name to rename it or take it out. Tap a thing to move it or take it out.</p>';
    }
    $all("[data-open-stored]", host).forEach(function (el) {
      el.addEventListener("click", function () { openStorageItemSheet(el.getAttribute("data-open-stored")); });
    });
    $all("[data-open-bay]", host).forEach(function (el) {
      el.addEventListener("click", function () { openStorageCompartmentSheet(el.getAttribute("data-open-bay")); });
    });
  }
  function openStorageItemSheet(itemId, compartmentId) {
    var rig = activeRig(); if (!rig) return;
    var st = storageFor(rig);
    var item = itemId ? st.items.find(function (i) { return i.id === itemId; }) : null;
    var draft = item ? JSON.parse(JSON.stringify(item)) : { id: uid(), name: "", compartmentId: compartmentId || (st.compartments[0] && st.compartments[0].id) || null };
    openSheet(
      sheetHead(item ? "One thing" : "Add a thing", "Name it, pick its bay — later, search finds it.") +
      '<div class="field"><label for="st-name">What is it?</label><input id="st-name" value="' + esc(draft.name) + '" placeholder="e.g. Fresh water hose" /></div>' +
      '<div class="field"><label for="st-bay">Which bay?</label><select id="st-bay">' + st.compartments.map(function (c) {
        return '<option value="' + c.id + '"' + (c.id === draft.compartmentId ? " selected" : "") + '>' + esc(c.name) + '</option>';
      }).join("") + '</select></div>' +
      '<div class="btnrow"><button class="btn block" id="st-save" type="button">Save this thing</button></div>' +
      (item ? '<div class="btnrow"><button class="btn ghost block" id="st-delete" type="button">Take it out of the bays</button></div>' : '')
    );
    wireClose(sheetHost);
    $("#st-save").addEventListener("click", function () {
      var name = $("#st-name").value.trim();
      if (!name) { toast("Give the thing a name first."); return; }
      draft.name = name; draft.compartmentId = $("#st-bay").value;
      if (!item) st.items.push(draft);
      else { var i = st.items.findIndex(function (x) { return x.id === item.id; }); if (i >= 0) st.items[i] = draft; }
      save(); closeSheet(); renderStorage(); toast("Saved — it's in the " + storageCompartmentName(rig, draft.compartmentId) + ".");
      /* Nov 19 (v80): after saving, jump the list to the bay the thing
         went into and flash it — on the phone the keyboard covers the
         lower bays, so without this a thing saved low down looks like
         it vanished. */
      var bayGroup = $('[data-bay="' + draft.compartmentId + '"]');
      if (bayGroup) {
        try { bayGroup.scrollIntoView({ block: "center" }); } catch (e) {}
        bayGroup.classList.add("flash");
        setTimeout(function () { bayGroup.classList.remove("flash"); }, 1600);
      }
    });
    if (item) $("#st-delete").addEventListener("click", function () {
      if (!confirm("Take " + item.name + " out of the bays?")) return;
      st.items = st.items.filter(function (x) { return x.id !== item.id; });
      save(); closeSheet(); renderStorage();
    });
    /* Nov 19 (v80): on the phone the space bar did nothing when adding
       a thing — the name field had no caret until it was tapped, so the
       keyboard's space went nowhere. Focus it on open (same as the
       custom-list sheet) so the keyboard lands in the field straight
       away, spaces and all. */
    $("#st-name").focus();
  }
  function openStorageCompartmentSheet(compId) {
    var rig = activeRig(); if (!rig) return;
    var st = storageFor(rig);
    var comp = compId ? st.compartments.find(function (c) { return c.id === compId; }) : null;
    var draft = comp ? JSON.parse(JSON.stringify(comp)) : { id: uid(), name: "" };
    var held = comp ? st.items.filter(function (i) { return i.compartmentId === comp.id; }).length : 0;
    openSheet(
      sheetHead(comp ? "One bay" : "Add a bay", comp ? "Rename it, or take it out when it's empty." : "Name a new bay — it joins the list.") +
      '<div class="field"><label for="sb-name">Bay name</label><input id="sb-name" value="' + esc(draft.name) + '" placeholder="e.g. Driver mid bay" /></div>' +
      '<div class="btnrow"><button class="btn block" id="sb-save" type="button">Save this bay</button></div>' +
      (comp ? '<div class="btnrow"><button class="btn ghost block" id="sb-delete" type="button">Take this bay out</button></div>' : '')
    );
    wireClose(sheetHost);
    $("#sb-save").addEventListener("click", function () {
      var name = $("#sb-name").value.trim();
      if (!name) { toast("Give the bay a name first."); return; }
      draft.name = name;
      if (!comp) st.compartments.push(draft);
      else { var i = st.compartments.findIndex(function (c) { return c.id === comp.id; }); if (i >= 0) st.compartments[i] = draft; }
      save(); closeSheet(); renderStorage(); toast("Bay saved.");
    });
    if (comp) $("#sb-delete").addEventListener("click", function () {
      if (held > 0) { toast("Move the " + held + (held === 1 ? " thing" : " things") + " out of this bay first."); return; }
      if (!confirm("Take " + comp.name + " out? It holds nothing.")) return;
      st.compartments = st.compartments.filter(function (c) { return c.id !== comp.id; });
      save(); closeSheet(); renderStorage();
    });
    /* Same as the thing sheet above (Nov 19, v80): focus the bay name
       on open so the keyboard lands in the field straight away. */
    $("#sb-name").focus();
  }

  /* ---------------- Fuel ---------------------------------------------------- */
  /* A fill-up is a date, an odometer, gallons, and what you paid — the
     price a gallon and the MPG work themselves out. Fill the tank each
     time and the math stays honest: the MPG on a fill-up is the miles it
     covered over its own gallons. Fuel money stays its own line — it
     never lands in "What she's cost", which is maintenance money. */
  function newFuel(o) {
    return { id: uid(), rigId: o.rigId, date: o.date || todayISO(), odometer: Number(o.odometer) || 0, gallons: Number(o.gallons) || 0, total: Number(o.total) || 0 };
  }
  function fuelForRig(rigId) {
    return (store.fuel || []).filter(function (f) { return f.rigId === rigId; }).sort(function (a, b) { return a.odometer - b.odometer || (a.date < b.date ? -1 : 1); });
  }
  function fuelMpg(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var mpg = null;
      if (i > 0 && list[i].gallons > 0 && list[i].odometer > list[i - 1].odometer) mpg = (list[i].odometer - list[i - 1].odometer) / list[i].gallons;
      out.push({ fill: list[i], mpg: mpg });
    }
    return out;
  }
  function fuelStats(rigId) {
    var list = fuelForRig(rigId);
    var miles = 0, intGallons = 0, allGallons = 0, spent = 0;
    list.forEach(function (f) { allGallons += Number(f.gallons) || 0; spent += Number(f.total) || 0; });
    for (var i = 1; i < list.length; i++) {
      if (list[i].odometer > list[i - 1].odometer) { miles += list[i].odometer - list[i - 1].odometer; intGallons += Number(list[i].gallons) || 0; }
    }
    return { count: list.length, miles: miles, gallons: allGallons, spent: spent, mpg: intGallons > 0 ? miles / intGallons : null, avgGal: allGallons > 0 ? spent / allGallons : null };
  }
  function exportFuelCSV(rigId) {
    var head = ["Date", "Odometer", "Gallons", "Total Paid", "Price Per Gallon"];
    var lines = [head.map(csvCell).join(",")];
    fuelForRig(rigId).forEach(function (f) {
      lines.push([f.date, f.odometer, f.gallons, (Number(f.total) || 0).toFixed(2), f.gallons > 0 ? (Number(f.total) / Number(f.gallons)).toFixed(3) : ""].map(csvCell).join(","));
    });
    return lines.join("\n");
  }
  function renderFuel() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var list = fuelForRig(rig.id);
    var stats = fuelStats(rig.id);
    var rows = fuelMpg(list).slice().reverse();
    $("#fuel-summary").innerHTML = list.length ?
      '<div class="big-number">' + (stats.mpg ? stats.mpg.toFixed(1) + ' <span class="small">MPG</span>' : '—') + '</div>' +
      '<p class="muted" style="margin:.2rem 0 0">' + num(stats.miles) + ' miles on ' + stats.gallons.toFixed(1) + ' gallons · ' + money(stats.spent) + ' spent' + (stats.avgGal ? ' · ' + money(stats.avgGal) + ' a gallon' : '') + '</p>' :
      '<p class="muted">Nothing logged yet — add your first fill-up and the MPG starts here.</p>';
    $("#fuel-list").innerHTML = rows.length ? rows.map(function (r) {
      var f = r.fill;
      return '<div class="row" data-open-fuel="' + f.id + '" style="cursor:pointer"><div class="grow"><div class="title">' + esc(fmtDate(f.date)) + '</div>' +
        '<div class="sub">' + num(f.odometer) + ' mi · ' + f.gallons + ' gal · ' + money(f.total) + (f.gallons > 0 ? ' · ' + money(f.total / f.gallons) + '/gal' : '') + '</div></div>' +
        '<b>' + (r.mpg ? r.mpg.toFixed(1) + ' MPG' : '—') + '</b></div>';
    }).join("") + '<p class="small muted">Tap a line to change it. Fill the tank each time — that\'s how the MPG stays honest.</p>' : '';
    $all("[data-open-fuel]").forEach(function (el) {
      el.addEventListener("click", function () { openFuelSheet(el.getAttribute("data-open-fuel")); });
    });
  }
  function openFuelSheet(fillId) {
    var rig = activeRig(); if (!rig) return;
    var fill = fillId ? (store.fuel || []).find(function (f) { return f.id === fillId; }) : null;
    var draft = fill ? JSON.parse(JSON.stringify(fill)) : newFuel({ rigId: rig.id, odometer: rig.mileage });
    openSheet(
      sheetHead(fill ? "One fill-up" : "Log a fill-up", "Gallons and what you paid — the MPG works itself out. Fill the tank each time.") +
      '<div class="fieldrow"><div class="field"><label for="fu-date">Date</label><input id="fu-date" type="date" value="' + esc(draft.date) + '" /></div>' +
      '<div class="field"><label for="fu-odo">Odometer (miles)</label><input id="fu-odo" inputmode="decimal" value="' + (draft.odometer || "") + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="fu-gal">Gallons</label><input id="fu-gal" inputmode="decimal" value="' + (draft.gallons || "") + '" /></div>' +
      '<div class="field"><label for="fu-total">What you paid</label><input id="fu-total" inputmode="decimal" placeholder="0.00" value="' + (draft.total || "") + '" /></div></div>' +
      '<p class="small muted" id="fu-ppg"></p>' +
      '<div class="btnrow"><button class="btn block" id="fu-save" type="button">Save this fill-up</button></div>' +
      (fill ? '<div class="btnrow"><button class="btn ghost block" id="fu-delete" type="button">Delete this fill-up</button></div>' : '')
    );
    wireClose(sheetHost);
    function ppg() {
      var g = Number($("#fu-gal").value) || 0, t = Number($("#fu-total").value) || 0;
      $("#fu-ppg").textContent = (g > 0 && t > 0) ? money(t / g) + " a gallon" : "";
    }
    ["fu-gal", "fu-total"].forEach(function (id) { $("#" + id).addEventListener("input", ppg); });
    ppg();
    $("#fu-save").addEventListener("click", function () {
      var gal = Number($("#fu-gal").value) || 0;
      if (gal <= 0) { toast("How many gallons went in?"); return; }
      draft.date = $("#fu-date").value || todayISO();
      draft.odometer = Number($("#fu-odo").value) || 0;
      draft.gallons = gal;
      draft.total = Number($("#fu-total").value) || 0;
      if (!fill) store.fuel.push(draft);
      else { var i = store.fuel.findIndex(function (f) { return f.id === fill.id; }); if (i >= 0) store.fuel[i] = draft; }
      /* A fill-up moves the rig forward, same as a logged job does. */
      if (draft.odometer > rig.mileage) rig.mileage = draft.odometer;
      save(); closeSheet(); renderFuel(); renderHome();
      toast("Fill-up saved.");
    });
    if (fill) $("#fu-delete").addEventListener("click", function () {
      if (!confirm("Delete this fill-up?")) return;
      store.fuel = store.fuel.filter(function (f) { return f.id !== fill.id; });
      save(); closeSheet(); renderFuel(); renderHome();
    });
  }

  /* ---------------- Trips --------------------------------------------------- */
  /* Where you went, when, and what it cost. The miles come from the
     odometer out and home; the money is the campground plus every
     fill-up dated inside the trip — the fuel counts itself, so the
     trip's total is the budget number, not a guess. */
  function newTrip(o) {
    return { id: uid(), rigId: o.rigId, name: o.name || "", destination: o.destination || "", startDate: o.startDate || todayISO(), endDate: o.endDate || "", campground: o.campground || "", campgroundCost: Number(o.campgroundCost) || 0, startOdo: Number(o.startOdo) || 0, endOdo: Number(o.endOdo) || 0, notes: o.notes || "" };
  }
  function tripsForRig(rigId) {
    return (store.trips || []).filter(function (t) { return t.rigId === rigId; }).sort(function (a, b) { return (a.startDate || "") < (b.startDate || "") ? 1 : -1; });
  }
  function tripCosts(trip) {
    var miles = (trip.endOdo > 0 && trip.startOdo > 0 && trip.endOdo > trip.startOdo) ? trip.endOdo - trip.startOdo : 0;
    var fuel = 0;
    fuelForRig(trip.rigId).forEach(function (f) {
      if ((!trip.startDate || f.date >= trip.startDate) && (!trip.endDate || f.date <= trip.endDate)) fuel += Number(f.total) || 0;
    });
    var camp = Number(trip.campgroundCost) || 0;
    return { miles: miles, fuel: fuel, camp: camp, total: fuel + camp };
  }
  function renderTrips() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var trips = tripsForRig(rig.id);
    $("#trips-list").innerHTML = trips.length ? trips.map(function (t) {
      var c = tripCosts(t);
      return '<div class="row" data-open-trip="' + t.id + '" style="cursor:pointer"><div class="grow"><div class="title">' + esc(t.name || t.destination || "Trip") + '</div>' +
        '<div class="sub">' + esc(fmtDate(t.startDate)) + (t.endDate ? ' – ' + esc(fmtDate(t.endDate)) : '') + (t.destination ? ' · ' + esc(t.destination) : '') + '</div>' +
        '<div class="sub">' + (c.miles ? num(c.miles) + ' miles · ' : '') + 'Fuel ' + money(c.fuel) + (c.camp ? ' · Campground ' + money(c.camp) : '') + ' · <b>' + money(c.total) + '</b></div></div></div>';
    }).join("") + '<p class="small muted">Tap a trip to change it. The fuel inside the trip dates counts itself.</p>'
      : '<p class="muted">No trips yet — add the next one and the book will keep the miles and the money.</p>';
    $all("[data-open-trip]").forEach(function (el) {
      el.addEventListener("click", function () { openTripSheet(el.getAttribute("data-open-trip")); });
    });
  }
  function openTripSheet(tripId) {
    var rig = activeRig(); if (!rig) return;
    var trip = tripId ? (store.trips || []).find(function (t) { return t.id === tripId; }) : null;
    var draft = trip ? JSON.parse(JSON.stringify(trip)) : newTrip({ rigId: rig.id, startOdo: rig.mileage });
    openSheet(
      sheetHead(trip ? "One trip" : "Plan a trip", "Where, when, and what it cost — the fuel inside these dates counts itself.") +
      '<div class="field"><label for="tr-name">Trip name</label><input id="tr-name" value="' + esc(draft.name) + '" placeholder="e.g. Fall run to the Smokies" /></div>' +
      '<div class="field"><label for="tr-dest">Where to</label><input id="tr-dest" value="' + esc(draft.destination) + '" placeholder="e.g. Gatlinburg, TN" /></div>' +
      '<div class="fieldrow"><div class="field"><label for="tr-start">Leaves</label><input id="tr-start" type="date" value="' + esc(draft.startDate) + '" /></div>' +
      '<div class="field"><label for="tr-end">Back</label><input id="tr-end" type="date" value="' + esc(draft.endDate || "") + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="tr-camp">Campground</label><input id="tr-camp" value="' + esc(draft.campground) + '" placeholder="e.g. Twin Creek" /></div>' +
      '<div class="field"><label for="tr-campcost">Campground cost</label><input id="tr-campcost" inputmode="decimal" placeholder="0.00" value="' + (draft.campgroundCost || "") + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="tr-odo1">Odometer out</label><input id="tr-odo1" inputmode="decimal" value="' + (draft.startOdo || "") + '" /></div>' +
      '<div class="field"><label for="tr-odo2">Odometer home</label><input id="tr-odo2" inputmode="decimal" value="' + (draft.endOdo || "") + '" /></div></div>' +
      '<div class="field"><label for="tr-notes">Notes</label><textarea id="tr-notes" placeholder="e.g. Site 14, full hookups, quiet at night.">' + esc(draft.notes || "") + '</textarea></div>' +
      '<div class="btnrow"><button class="btn block" id="tr-save" type="button">Save this trip</button></div>' +
      (trip ? '<div class="btnrow"><button class="btn ghost block" id="tr-delete" type="button">Delete this trip</button></div>' : '')
    );
    wireClose(sheetHost);
    $("#tr-save").addEventListener("click", function () {
      draft.name = $("#tr-name").value.trim();
      draft.destination = $("#tr-dest").value.trim();
      draft.startDate = $("#tr-start").value || todayISO();
      draft.endDate = $("#tr-end").value;
      draft.campground = $("#tr-camp").value.trim();
      draft.campgroundCost = Number($("#tr-campcost").value) || 0;
      draft.startOdo = Number($("#tr-odo1").value) || 0;
      draft.endOdo = Number($("#tr-odo2").value) || 0;
      draft.notes = $("#tr-notes").value.trim();
      if (!draft.name && !draft.destination) { toast("Give the trip a name or a place first."); return; }
      if (!trip) { store.trips = store.trips || []; store.trips.push(draft); }
      else { var i = store.trips.findIndex(function (t) { return t.id === trip.id; }); if (i >= 0) store.trips[i] = draft; }
      save(); closeSheet(); renderTrips(); renderHome(); toast("Trip saved.");
    });
    if (trip) $("#tr-delete").addEventListener("click", function () {
      if (!confirm("Delete this trip?")) return;
      store.trips = store.trips.filter(function (t) { return t.id !== trip.id; });
      save(); closeSheet(); renderTrips(); renderHome();
    });
  }

  function renderMore() {
    var rig = activeRig(); if (!rig) { showScreen("setup"); return; }
    var year = new Date().getFullYear();
    var av = $("#about-version"); if (av) av.textContent = "RollOnRV v1.0 · build " + APP_VERSION;
    $("#costs-year").textContent = year;
    var c = costsForYear(rig.id, year);
    var cpm = costPerMile(rig);
    var cats = Object.keys(c.byCat).sort(function (a, b) { return c.byCat[b] - c.byCat[a]; });
    var max = cats.length ? Math.max.apply(null, cats.map(function (k) { return c.byCat[k]; })) : 0;
    var html = '<div class="big-number money">' + money(c.total) + '</div>' +
      '<p class="muted" style="margin:.2rem 0 0">' + (cpm ? money(cpm.perMile) + ' a mile over the last ' + num(cpm.miles) + ' miles' : 'all-in this year') + '</p>';
    if (cats.length) {
      html += cats.map(function (k) {
        return '<div class="bar-row"><span class="lbl">' + esc(k) + '</span><span class="bar"><div style="width:' + Math.round(c.byCat[k] / max * 100) + '%"></div></span><span class="amt money">' + money(c.byCat[k]) + '</span></div>';
      }).join("");
    } else {
      html += '<p class="muted">Nothing logged yet this year — the numbers will grow as the jobs do.</p>';
    }
    $("#costs-body").innerHTML = html;
    $("#rig-body").innerHTML =
      '<div class="row"><div class="grow"><div class="title">' + esc(rigName(rig)) + '</div><div class="sub">' + esc(rig.type) + '</div></div></div>' +
      '<div class="row"><div class="grow"><div class="title">Odometer</div></div><b>' + num(rig.mileage) + ' mi</b></div>' +
      '<div class="row"><div class="grow"><div class="title">Generator hours</div></div><b>' + num(rig.genHours) + ' hrs</b></div>' +
      '<div class="row"><div class="grow"><div class="title">Tire pressures</div></div><b>' + (rig.psiFront ? rig.psiFront + " / " + (rig.psiRear || "—") + " psi" : "Not set") + '</b></div>';
    proRefreshPremiumCard();
  }

  /* ---------------- sheets (modals) ---------------------------------------- */
  var sheetHost = null;
  function openSheet(html) {
    sheetHost = $("#sheet-host");
    /* A sheet that re-draws itself after a tap (the rig questions, the
       usual-jobs list) used to jump — the old sheet was destroyed and
       the new one opened wherever the browser put it (Nov 15: "the page
       jumps to the bottom every time you make a choice"). Keep the
       scroll when it is the same sheet coming back; a new sheet still
       opens at the top. */
    var oldSheet = sheetHost.querySelector(".sheet");
    var oldTop = oldSheet ? oldSheet.scrollTop : 0;
    var oldHead = oldSheet ? (oldSheet.querySelector("h2") || {}).textContent : "";
    sheetHost.innerHTML = '<div class="sheet-backdrop"><div class="sheet" role="dialog">' + html + "</div></div>";
    sheetHost.hidden = false;
    var newSheet = sheetHost.querySelector(".sheet");
    if (oldHead && newSheet && (newSheet.querySelector("h2") || {}).textContent === oldHead) newSheet.scrollTop = oldTop;
    $(".sheet-backdrop", sheetHost).addEventListener("click", function (e) {
      if (e.target.classList.contains("sheet-backdrop")) closeSheet();
    });
  }
  function closeSheet() { if (sheetHost) { sheetHost.hidden = true; sheetHost.innerHTML = ""; } }
  function sheetHead(title, sub) {
    /* The Close button sits beside the title (Nov 15: it used to ride
       up on a negative margin and cover the subtitle's last words —
       on the "Add a task" sheet it sat on top of "just once."). The
       instructions run full-width underneath, so nothing ever overlaps. */
    return '<div class="sheet-head"><h2>' + title + '</h2>' +
      '<button class="btn small ghost" data-close type="button">Close</button></div>' +
      (sub ? '<p class="muted">' + sub + '</p>' : '');
  }
  function wireClose(root) {
    $all("[data-close]", root || document).forEach(function (b) { b.addEventListener("click", closeSheet); });
  }

  /* ---------------- photos -------------------------------------------------- */
  var MAX_PHOTO_DIM = 1024, MAX_PHOTOS_PER_LOG = 12, STORE_SOFT_LIMIT = 4500000;
  function downscalePhoto(dataUrl) {
    return new Promise(function (resolve) {
      /* A phone photo that never decodes must not hang the photo flow
         forever (Nov 15: a picked photo that never lands looks identical
         to a dead button). The 6s timer settles with the original, same
         as the error path. */
      var done = false;
      function finish(v) { if (!done) { done = true; resolve(v); } }
      setTimeout(function () { finish(dataUrl); }, 6000);
      try {
        var img = new Image();
        img.onload = function () {
          try {
            var w = img.width, h = img.height;
            if (w <= MAX_PHOTO_DIM && h <= MAX_PHOTO_DIM) { finish(dataUrl); return; }
            var s = Math.min(MAX_PHOTO_DIM / w, MAX_PHOTO_DIM / h);
            var c = document.createElement("canvas");
            c.width = Math.round(w * s); c.height = Math.round(h * s);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            finish(c.toDataURL("image/jpeg", 0.8));
          } catch (e) { finish(dataUrl); }
        };
        img.onerror = function () { finish(dataUrl); };
        img.src = dataUrl;
      } catch (e) { finish(dataUrl); }
    });
  }
  function storeHasRoom(bytes) {
    try { return (localStorage.getItem(KEY) || "").length + bytes < STORE_SOFT_LIMIT; } catch (e) { return true; }
  }
  var photoPending = null; // function(dataUrls) — one picker session can hand over several photos
  function openPhotoInput() {
    var input = $("#photo-input");
    input.value = "";
    input.click();
  }
  function requestPhoto(cb) {
    photoPending = cb;
    if (isNative) {
      try {
        var Camera = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera;
        if (Camera && Camera.getPhoto) {
          Camera.getPhoto({ quality: 80, allowEditing: false, resultType: "dataUrl", source: "prompt" })
            .then(function (r) { var f = photoPending; photoPending = null; if (f && r && r.dataUrl) f([r.dataUrl]); })
            .catch(function (err) {
              /* The native camera call can fail (plugin not answering, no
                 permission, anything else) — and a failed call used to swallow
                 the tap entirely, so the button looked dead (Nov 15, TestFlight:
                 "Add photo of your rig won't open"). Fall back to the file
                 picker so a photo is always reachable. A user cancel is the one
                 case that stays silent: they already said no. The callback must
                 STAY pending for the fallback picker — clearing it here (v45)
                 meant the picker opened, a photo was chosen, and nothing
                 happened (Nov 15: "opens the camera and the photos but won't
                 add to screen"). */
              var msg = "";
              try { msg = String((err && err.message) || err || ""); } catch (e) {}
              if (/cancel/i.test(msg)) { photoPending = null; return; }
              openPhotoInput();
            });
          return;
        }
      } catch (e) {}
    }
    openPhotoInput();
  }

  /* ---------------- local reminders (native only) --------------------------- */
  /* Rick (Nov 16, from his old app's screenshots): a Reminders screen —
     on/off, the time, the day it is due or the day before, one reminder
     covering the whole maintenance day, a two-week heads-up to book the
     shop for jobs left to a pro, and a nudge every couple of weeks while
     anything is overdue. The planner is pure (tasks in, notices out) so
     the tests can run it without a phone; the scheduler is the thin
     native wrapper around it. "Left to a pro" is the job sheet's own
     "Leave it to the pro" switch (task.needsPro) — no second toggle. */
  function reminderSettings() {
    var s = store.settings || {};
    return {
      on: s.remindersOn !== false,
      hour: (s.reminderHour != null && s.reminderHour >= 0 && s.reminderHour <= 23) ? s.reminderHour : 9,
      when: s.reminderWhen === "before" ? "before" : "due"
    };
  }
  function isOverdueForReminders(t, today) {
    if (!t.nextDueDate) return false;
    if (daysBetween(t.nextDueDate, today) <= 0) return false;
    if (t.snoozedUntil && t.snoozedUntil > today) return false;
    return true;
  }
  function planReminders(tasks, rigId, today, rs) {
    // rs: { on, hour, when, catchupDue } — catchupDue is an ISO date or null.
    var out = [];
    if (!rs.on) return out;
    var myTasks = tasks.filter(function (t) { return t.rigId === rigId && t.nextDueDate; });
    // One reminder per maintenance day: every job due that day, in one notice.
    var byDay = {};
    myTasks.forEach(function (t) {
      var remindDay = rs.when === "before" ? addDaysISO(t.nextDueDate, -1) : t.nextDueDate;
      if (!remindDay) return;
      var ahead = daysBetween(today, remindDay);
      if (ahead == null || ahead < 0 || ahead > 30) return;
      (byDay[remindDay] = byDay[remindDay] || []).push(t);
    });
    Object.keys(byDay).sort().forEach(function (day, i) {
      var jobs = byDay[day];
      var d = parseISO(day); if (!d) return;
      var at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), rs.hour, 0, 0);
      var label = day === today ? "today" : fmtDate(day);
      var body = jobs.length === 1
        ? jobs[0].title + " is due " + label + "."
        : jobs.length + " jobs due " + label + ": " + jobs.slice(0, 3).map(function (j) { return j.title; }).join(", ") + (jobs.length > 3 ? ", and more" : "") + ".";
      out.push({ id: 2000 + (i % 800), title: "RollOnRV — maintenance day", body: body, at: at });
    });
    // Two weeks ahead for work left to a pro, so there is time to book.
    // Only jobs due 15–30 days out: any closer and the day digest covers it.
    myTasks.forEach(function (t, i) {
      if (!t.needsPro) return;
      var ahead = daysBetween(today, t.nextDueDate);
      if (ahead == null || ahead <= 14 || ahead > 30) return;
      var bookDay = addDaysISO(t.nextDueDate, -14); if (!bookDay) return;
      var d = parseISO(bookDay); if (!d) return;
      var at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), rs.hour, 0, 0);
      out.push({ id: 3000 + (i % 800), title: "RollOnRV — time to book", body: t.title + " is due in two weeks — time to book the shop.", at: at });
    });
    // One nudge every couple of weeks while anything is overdue.
    var overdue = myTasks.filter(function (t) { return isOverdueForReminders(t, today); });
    if (overdue.length && rs.catchupDue) {
      var d = parseISO(rs.catchupDue); if (d) {
        var at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), rs.hour, 0, 0);
        out.push({ id: 4000, title: "RollOnRV — time to catch up", body: overdue.length === 1 ? overdue[0].title + " is still overdue." : overdue.length + " jobs are overdue — time to catch up.", at: at });
      }
    }
    // Nothing in the past: a notice whose time has already gone by today
    // would fire at once, so leave it out — the next day's run picks it up.
    var now = new Date();
    return out.filter(function (n) { return n.at > now; });
  }
  function scheduleReminders() {
    if (!isNative) return;
    try {
      var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
      if (!LN || !LN.schedule) return;
      var rig = activeRig(); if (!rig) return;
      var rs = reminderSettings();
      store.settings = store.settings || {};
      if (!rs.on) {
        store.settings.catchupDue = null;
        if (LN.cancelAll) LN.cancelAll();
        return;
      }
      // The catch-up date holds steady across saves: set it once, move it
      // only after it has gone by, clear it when nothing is overdue.
      var today = todayISO();
      var overdue = store.tasks.filter(function (t) { return t.rigId === rig.id && isOverdueForReminders(t, today); });
      if (overdue.length) {
        var cd = store.settings.catchupDue;
        if (!cd || cd < today) { store.settings.catchupDue = addDaysISO(today, 14); save(); }
      } else if (store.settings.catchupDue) { store.settings.catchupDue = null; save(); }
      rs.catchupDue = store.settings.catchupDue || null;
      var plan = planReminders(store.tasks, rig.id, today, rs);
      // Rebuild the whole set each time, so a job that moved, finished,
      // or was deleted never leaves a stale notice behind. The old
      // per-task ids (1000+) are cleared with it.
      if (LN.cancelAll) LN.cancelAll();
      var notifs = plan.map(function (n) { return { id: n.id, title: n.title, body: n.body, schedule: { at: n.at } }; });
      if (notifs.length) LN.schedule({ notifications: notifs });
    } catch (e) {}
  }

  /* ---------------- Reminders screen ---------------------------------------- */
  function openRemindersSheet() {
    var rs = reminderSettings();
    function draw(permLine) {
      openSheet(
        sheetHead("Reminders", "Get told when jobs are due — one notice for the whole day, not one per job.") +
        '<div class="field"><label>Task reminders</label>' +
        '<div class="btnrow"><button class="btn ' + (rs.on ? "" : "ghost") + ' block" id="rm-toggle" type="button">' + (rs.on ? "Reminders are on" : "Reminders are off") + '</button></div></div>' +
        '<div class="field"><label for="rm-hour">Remind me at</label><select id="rm-hour">' +
          [7, 8, 9, 10].map(function (h) { return '<option value="' + h + '"' + (rs.hour === h ? " selected" : "") + '>' + h + ':00 AM</option>'; }).join("") + '</select></div>' +
        '<div class="field"><label for="rm-when">Remind me</label><select id="rm-when">' +
          '<option value="due"' + (rs.when === "due" ? " selected" : "") + '>The day it is due</option>' +
          '<option value="before"' + (rs.when === "before" ? " selected" : "") + '>The day before it is due</option></select></div>' +
        '<p class="muted small">You\'ll get a reminder when it is…</p>' +
        '<p class="small"><b>Your maintenance day.</b> One reminder covering everything due that day.</p>' +
        '<p class="small"><b>Time to book something.</b> Two weeks ahead for work you\'ve left to a pro, so there is time to get an appointment.</p>' +
        '<p class="small"><b>Time to catch up.</b> A single nudge every couple of weeks while anything is overdue.</p>' +
        (permLine ? '<p class="muted small">' + permLine + '</p>' : '') +
        '<div class="btnrow"><button class="btn block" data-close type="button">Done</button></div>'
      );
      wireClose(sheetHost);
      $("#rm-toggle").addEventListener("click", function () {
        rs.on = !rs.on; store.settings = store.settings || {}; store.settings.remindersOn = rs.on; save(); scheduleReminders(); draw(permLine);
      });
      $("#rm-hour").addEventListener("change", function () {
        rs.hour = Number($("#rm-hour").value); store.settings = store.settings || {}; store.settings.reminderHour = rs.hour; save(); scheduleReminders();
      });
      $("#rm-when").addEventListener("change", function () {
        rs.when = $("#rm-when").value; store.settings = store.settings || {}; store.settings.reminderWhen = rs.when; save(); scheduleReminders();
      });
    }
    draw("");
    // The phone's own switch is the last word: say plainly whether
    // notices are allowed on this device.
    if (isNative) {
      try {
        var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
        if (LN && LN.checkPermissions) LN.checkPermissions().then(function (p) {
          var line = (p && p.display === "granted")
            ? "Notifications are allowed on this device."
            : "Notifications are off on this device — turn them on in your phone's Settings, then come back here.";
          if (sheetHost && sheetHost.querySelector("#rm-toggle")) draw(line);
        }).catch(function () {});
      } catch (e) {}
    }
  }

  /* ---------------- RollOnRV Pro (v73 foundation) -------------------------- */
  // The store pattern is ported from the Bible study app (Build 7), which
  // proved it: capacitor-plugin-cdv-purchase v13 (window.CdvPurchase,
  // loaded from cdv-purchase-store.js). Products must exist in App Store
  // Connect / Play Console with these exact IDs before a sandbox purchase
  // can be tested. Everything here no-ops on the web (no native bridge)
  // and falls back to the "not open yet" note. Never use bare `store`
  // here — that name is the app's own localStorage data store; the
  // purchase store is always window.CdvPurchase.store.
  //
  // The lesson from the other app (Nov 16 — it took forever to treat him
  // as Pro after he paid, and he left them a bad review): unlock LOCALLY
  // the instant the store confirms. Re-check on every launch. Restore
  // Purchases button for a fresh install. Never ship premium untested.
  var PRO_PRODUCT_IDS = {
    monthly: "rollonrv_premium_monthly",
    yearly: "rollonrv_premium_yearly",
    lifetime: "rollonrv_premium_lifetime"
  };
  var PRO_PRICES = { monthly: "$4.99/mo", yearly: "$39.99/yr", lifetime: "$79.99" };
  var PRO_CONFIG = {
    // dev builds only: true unlocks Pro locally for testing. Always false
    // in release. (Same pattern as the Bible app's NOVA_CONFIG.devUnlock.)
    // How the owner gets Pro for free in production: the same way any
    // subscriber does — an App Store offer code or a Google Play promo
    // code, redeemed in the store app. The store then replays the
    // entitlement through the normal verified chain below and the app
    // grants it. No account, no backdoor, nothing special in the code.
    devUnlock: false
  };
  /* Two separate facts about the store, tracked separately — that is the
     v74 fix for the Nov 17 sandbox test, where tapping a plan sat on
     "Opening the store…" forever. "Initialized" means we called
     initialize() once (registering twice is a bug, so this is guarded).
     "Ready" means the store's ready() callback actually fired, which is
     the only moment order() can be trusted to reach Apple. v73 set one
     flag right after initialize() and never looked back, so a store that
     never became ready left the user stuck with no error and no retry. */
  var proStoreInitialized = false;
  var proStoreReadyFired = false;
  /* Whether the store's setup (initialize()) ever answered — v81: the
     paywall could not tell "the store never answered" from "it
     answered with no products". This flag is the difference: it is set
     the moment initialize()'s promise settles, either way. */
  var proStoreInitSettled = false;
  /* The last staged store check (v82): one line naming which of the
     three native store calls — setup, products, receipt — answered and
     which stuck. A restart did not clear the v81 hang, so the stall is
     deterministic; the stages say where. Null until a check has run. */
  var proStoreDiag = null;
  var proStoreDiagDone = false;
  /* The last store error, in plain words (Nov 19 — build 32 still showed
     "The store isn't responding" with the IAP capability in place: the
     store was failing silently, initialize() swallowing its own errors.
     The paywall now says WHY, so one retry tells us the real reason). */
  var proStoreLastError = null;
  function proStoreErrorText(err) {
    try {
      var S = window.CdvPurchase;
      var code = err && err.code;
      var name = null;
      if (S && S.ErrorCode) {
        for (var k in S.ErrorCode) { if (S.ErrorCode[k] === code) { name = k; break; } }
      }
      var msg = (err && err.message) || "";
      var label = name || (code !== undefined && code !== null ? String(code) : "STORE");
      return msg ? label + ": " + msg : label;
    } catch (e) { return "STORE"; }
  }
  function proStoreProductStates() {
    try {
      var S = window.CdvPurchase;
      if (!S || !S.store || typeof S.store.get !== "function") return "";
      var names = { monthly: "Monthly", yearly: "Yearly", lifetime: "Lifetime" };
      var parts = [];
      for (var key in PRO_PRODUCT_IDS) {
        var p = S.store.get(PRO_PRODUCT_IDS[key]);
        parts.push(names[key] + ": " + (p ? (typeof p.state === "string" && p.state ? p.state : "found") : "not found"));
      }
      return parts.join(" ");
    } catch (e) { return ""; }
  }
  function proStoreFailNote() {
    var bits = ["The store isn't responding right now."];
    /* Only while ready has never fired: say which side of the fork this
       is. If setup never settled, the store never answered. If it
       settled cleanly, the store answered but never became ready and no
       products came back. (Once ready has fired, say nothing about
       readiness — the note is about a later failure then.) */
    if (!proStoreReadyFired) {
      bits.push(proStoreInitSettled ? "The store answered, but it never became ready." : "The store never answered — its setup did not finish.");
    }
    if (proStoreDiag) bits.push(proStoreDiag);
    if (proStoreLastError) bits.push("Store problem: " + proStoreLastError + ".");
    var states = proStoreProductStates();
    if (states) bits.push(states + ".");
    bits.push("Check your connection, then try again.");
    return bits.join(" ");
  }
  function getPremium() {
    var s = store.settings || {};
    var p = s.premium;
    if (!p || typeof p !== "object") p = {};
    if (p.status !== "premium") p.status = "free";
    if (typeof p.productId !== "string") p.productId = null;
    if (typeof p.since !== "number") p.since = null;
    s.premium = p;
    store.settings = s;
    return p;
  }
  function savePremium() { save(); }
  function isPro() {
    if (PRO_CONFIG.devUnlock) return true;
    return getPremium().status === "premium";
  }
  function proPlanLabel(productId) {
    if (productId === PRO_PRODUCT_IDS.monthly) return "Monthly";
    if (productId === PRO_PRODUCT_IDS.yearly) return "Yearly";
    if (productId === PRO_PRODUCT_IDS.lifetime) return "Lifetime";
    return "";
  }
  function grantPremium(productId) {
    var p = getPremium();
    p.status = "premium";
    p.productId = productId || null;
    p.since = Date.now();
    savePremium();
    proRefreshStatus();
  }
  function proStoreAvailable() {
    try {
      return typeof window !== "undefined" &&
        typeof window.CdvPurchase !== "undefined" &&
        typeof window.Capacitor !== "undefined" &&
        typeof window.Capacitor.isNativePlatform === "function" &&
        window.Capacitor.isNativePlatform();
    } catch (e) { return false; }
  }
  function proStoreNote(msg) {
    var note = $(".pro-note");
    if (note) { note.textContent = msg; return; }
    toast(msg);
  }
  function proProductIdFromReceipt(receipt) {
    var ids = [PRO_PRODUCT_IDS.monthly, PRO_PRODUCT_IDS.yearly, PRO_PRODUCT_IDS.lifetime];
    try {
      var txs = (receipt && receipt.sourceReceipt && receipt.sourceReceipt.transactions) || [];
      for (var i = txs.length - 1; i >= 0; i--) {
        var prods = txs[i].products || [];
        for (var j = 0; j < prods.length; j++) {
          if (prods[j] && ids.indexOf(prods[j].id) !== -1) return prods[j].id;
        }
      }
      // The receipt's own id is the validated product id.
      if (receipt && receipt.id && ids.indexOf(receipt.id) !== -1) return receipt.id;
    } catch (e) {}
    return null;
  }
  // The store replays owned entitlements through the verified chain on
  // launch, so a returning Pro user is Pro again without tapping
  // anything. The other direction matters too: when a subscription has
  // ended, the store stops replaying it, so a stored grant must not
  // live forever. Once the store is ready, check what is actually owned
  // and clear a grant nothing backs. Offline the store cannot confirm
  // either way, so the stored grant stands until the phone is back.
  function proRecheckOwnership() {
    if (PRO_CONFIG.devUnlock) return;
    var p = getPremium();
    if (p.status !== "premium") return;
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      var S = window.CdvPurchase;
      if (!S || !S.store || typeof S.store.owned !== "function") return;
      var owned = S.store.owned(PRO_PRODUCT_IDS.monthly) ||
        S.store.owned(PRO_PRODUCT_IDS.yearly) ||
        S.store.owned(PRO_PRODUCT_IDS.lifetime);
      if (!owned) {
        p.status = "free"; p.productId = null; p.since = null;
        savePremium();
        proRefreshStatus();
      }
    } catch (e) {}
  }
  function proRefreshPremiumCard() {
    var card = $("#premium-card"); if (!card) return;
    var title = $("#premium-title"); var blurb = $("#premium-blurb"); var btn = $("#premium-open-btn");
    if (!title || !blurb || !btn) return;
    if (isPro()) {
      var p = getPremium();
      title.innerHTML = 'Premium <span class="hand">— active</span>';
      blurb.textContent = "Pro is on" +
        (p.productId ? " — " + proPlanLabel(p.productId) : "") +
        (p.since ? " since " + fmtDate(new Date(p.since).toISOString().slice(0, 10)) : "") +
        ". The ownership report, the Document Vault, parts & warranty tracking, more rigs, and backup are yours.";
      btn.textContent = "Pro is active";
    } else {
      title.innerHTML = 'Premium <span class="hand">— a drawer for later</span>';
      blurb.textContent = "The free core is the whole book, and it stays free. Pro adds the extras behind the door: the ownership report, the Document Vault, parts & warranty tracking, more than one rig, and backup.";
      btn.textContent = "See Pro plans";
    }
  }
  function proRefreshStatus() {
    proRefreshPremiumCard();
    if ($("#pro-paywall")) openProPaywall();
  }
  function proStoreInit() {
    if (!proStoreAvailable() || proStoreInitialized) return;
    try {
      var S = window.CdvPurchase;
      var platform = window.Capacitor.getPlatform() === "ios" ? S.Platform.APPLE_APPSTORE : S.Platform.GOOGLE_PLAY;
      S.store.register([
        { id: PRO_PRODUCT_IDS.monthly, type: S.ProductType.PAID_SUBSCRIPTION, platform: platform },
        { id: PRO_PRODUCT_IDS.yearly, type: S.ProductType.PAID_SUBSCRIPTION, platform: platform },
        { id: PRO_PRODUCT_IDS.lifetime, type: S.ProductType.NON_CONSUMABLE, platform: platform }
      ]);
      S.store.when()
        .approved(function (transaction) { transaction.verify(); })
        .verified(function (receipt) {
          // Grant on .verified — that IS the instant unlock. Finish only
          // after the grant, so a purchase is never paid for and lost.
          grantPremium(proProductIdFromReceipt(receipt));
          receipt.finish();
        });
      // NOTE (Nov 19, build 39 — the store bug): the when() chain has
      // NO .error() method in the real plugin (approved, verified,
      // finished... but no error). The old code chained .error() here,
      // which threw on every init, so initialize() was never called,
      // ready() never fired, and the paywall always said the store
      // never answered — in every build. The test fakes had .error(),
      // which is why the suite never caught it. Transaction errors go
      // through the global handler below instead.
      S.store.ready(function () { proStoreReadyFired = true; proRecheckOwnership(); });
      // A global error handler: initialize/load failures never reach the
      // transaction chain, so without this the store fails silently and
      // ready() simply never fires. A cancelled purchase gets its kind
      // note here (the chain has no error method to say it).
      if (typeof S.store.error === "function") {
        S.store.error(function (err) {
          if (err && S.ErrorCode && err.code === S.ErrorCode.PAYMENT_CANCELLED) {
            proStoreNote("Purchase cancelled — nothing was charged.");
            return;
          }
          proStoreLastError = proStoreErrorText(err);
          proStoreNote(proStoreFailNote());
        });
      }
      // initialize() resolves with its errors — read them, don't swallow
      // them. (Older stubs return nothing; the guard keeps them working.)
      var initResult = S.store.initialize();
      if (initResult && typeof initResult.then === "function") {
        initResult.then(function (errs) {
          proStoreInitSettled = true;
          if (errs && errs.length) {
            proStoreLastError = errs.map(proStoreErrorText).join("; ");
            proStoreNote(proStoreFailNote());
          }
        }, function (err) {
          proStoreInitSettled = true;
          proStoreLastError = proStoreErrorText(err);
          proStoreNote(proStoreFailNote());
        });
      }
      proStoreInitialized = true;
    } catch (e) {
      /* A setup throw must be VISIBLE, not swallowed: the v81–v82
         "never answered" mystery was a throw here (the when-chain
         .error() call) that no note ever named. Record it so the
         paywall says why, and leave init unflagged so a later tap can
         try again instead of giving up forever. */
      try { proStoreLastError = "setup: " + ((e && e.message) || "store setup failed"); } catch (e2) {}
    }
  }
  /* Race one native store call against a timeout. Resolves {ok:true}
     when the call settles, {ok:false, timedOut:true} when the timeout
     wins, {ok:false} when it rejects or throws. A timed-out call may
     still finish later in the background — this only reports what had
     answered by the deadline. */
  function proStoreStage(fn, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        if (!done) { done = true; resolve({ ok: false, timedOut: true }); }
      }, ms);
      var p;
      try { p = fn(); } catch (e) {
        if (!done) { done = true; clearTimeout(timer); resolve({ ok: false }); }
        return;
      }
      Promise.resolve(p).then(function () {
        if (!done) { done = true; clearTimeout(timer); resolve({ ok: true }); }
      }, function () {
        if (!done) { done = true; clearTimeout(timer); resolve({ ok: false }); }
      });
    });
  }
  /* Ask the native store plugin, stage by stage, which of its three
     native store calls answers: setup (init — current purchases),
     products (load — the product list), receipt (loadReceipts — the
     app receipt). Each gets its own timeout; the stages run together,
     so the whole check costs one timeout, not three. Runs once per app
     launch — the answer does not change while the app is open. A
     second call returns the same in-flight or finished check. */
  var proStoreDiagPromise = null;
  function proStoreDiagnose(timeoutMs) {
    if (proStoreDiagDone) return Promise.resolve(proStoreDiag);
    if (proStoreDiagPromise) return proStoreDiagPromise;
    var ms = timeoutMs || 10000;
    var P = null;
    try {
      P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.PurchasePlugin;
    } catch (e) { P = null; }
    if (!P || typeof P.init !== "function" || typeof P.load !== "function" || typeof P.loadReceipts !== "function") {
      proStoreDiag = "Store check: the store plugin isn't in the app.";
      proStoreDiagDone = true;
      return Promise.resolve(proStoreDiag);
    }
    var ids = [PRO_PRODUCT_IDS.monthly, PRO_PRODUCT_IDS.yearly, PRO_PRODUCT_IDS.lifetime];
    proStoreDiagPromise = Promise.all([
      proStoreStage(function () { return P.init({}); }, ms),
      proStoreStage(function () { return P.load({ productIds: ids }); }, ms),
      proStoreStage(function () { return P.loadReceipts(); }, ms)
    ]).then(function (results) {
      var names = ["setup", "products", "receipt"];
      var parts = results.map(function (r, i) {
        return names[i] + " " + (r.ok ? "OK" : (r.timedOut ? "stuck" : "failed"));
      });
      proStoreDiag = "Store check: " + parts.join(", ") + ".";
      proStoreDiagDone = true;
      return proStoreDiag;
    });
    return proStoreDiagPromise;
  }
  /* Wait for the store's ready() callback, up to timeoutMs. Resolves true
     the moment ready has fired, false if it never does — the caller then
     says so plainly instead of leaving "Opening the store…" on screen. */
  function proStoreWaitReady(timeoutMs) {
    if (proStoreReadyFired) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var waited = 0;
      var timer = setInterval(function () {
        if (proStoreReadyFired) { clearInterval(timer); resolve(true); return; }
        waited += 250;
        if (waited >= timeoutMs) { clearInterval(timer); resolve(false); }
      }, 250);
    });
  }
  function proRestorePurchases() {
    if (!proStoreAvailable()) {
      proStoreNote("Restore works in the app once the Pro products are set up in the App Store / Google Play.");
      return;
    }
    try {
      proStoreNote("Checking your purchases…");
      window.CdvPurchase.store.restorePurchases();
    } catch (e) {
      proStoreNote("Restore couldn't run right now. Please try again.");
    }
  }
  function proSubscribe(plan, timeoutMs) {
    if (!proStoreAvailable()) {
      // No native store (web, or products not wired yet): say so plainly
      // instead of taking anyone's money or failing quietly.
      proStoreNote("Subscriptions aren't open yet — the Pro products are still being set up in the App Store and Google Play. Check back soon.");
      return;
    }
    var productId = PRO_PRODUCT_IDS[plan] || PRO_PRODUCT_IDS.monthly;
    // If initialization never ran (or threw at boot), try it now — the
    // guard inside proStoreInit keeps a second call from registering twice.
    proStoreInit();
    if (proStoreReadyFired) {
      try {
        window.CdvPurchase.store.order(productId);
      } catch (e) {
        proStoreNote("The store couldn't open the purchase. Please try again.");
      }
      return;
    }
    // The store hasn't said it's ready yet. order() before ready waits
    // forever with no error — that is the Nov 17 sandbox failure — so
    // wait for ready up to 15 seconds, and if it never comes, say so
    // plainly and let the user try again. Never leave them on
    // "Opening the store…" with no way out. (timeoutMs is a test hook —
    // the app always calls with the default.)
    proStoreNote("Opening the store…");
    // The staged check runs alongside the wait: whichever native call
    // is stuck, the fail note names it when the wait gives up. The
    // note is built only after the check finishes, so its line is
    // always in the message the user actually sees.
    proStoreDiagnose(timeoutMs || 10000);
    proStoreWaitReady(timeoutMs || 15000).then(function (ok) {
      if (ok) {
        try {
          window.CdvPurchase.store.order(productId);
        } catch (e) {
          proStoreNote("The store couldn't open the purchase. Please try again.");
        }
      } else {
        proStoreDiagnose().then(function () { proStoreNote(proStoreFailNote()); });
      }
    });
  }
  // The paywall has to do the selling — there is no free trial, so the
  // door has a window: every Pro feature is named plainly, with what it
  // does, before any price appears. Pay from day one.
  function proPaywallHTML() {
    var pro = isPro();
    var p = getPremium();
    var html = sheetHead("RollOnRV Pro", "The free core is the whole book, and it stays free. Pro opens the extras behind the door.") +
      '<div id="pro-paywall">' +
      '<p class="small"><b>Ownership report.</b> One clean PDF of the whole book, ready to hand a buyer when you sell the rig.</p>' +
      '<p class="small"><b>Document Vault.</b> Your document vault — registration, insurance, warranties, manuals — with expiry alerts so nothing lapses quietly.</p>' +
      '<p class="small"><b>Parts &amp; warranty tracking.</b> Every part you bought, what it cost, and when its warranty runs out.</p>' +
      '<p class="small"><b>More than one rig.</b> A book for each rig you own, in the same app.</p>' +
      '<p class="small"><b>Backup.</b> A copy of your book, safe if the phone is lost or replaced.</p>' +
      '<p class="small"><b>Subscribe now and your rate never goes up.</b> Early subscribers keep their rate — if the price goes up later for new subscribers, yours stays where it is.</p>';
    if (pro) {
      html += '<p class="small"><b>Pro is active' +
        (p.productId ? " — " + proPlanLabel(p.productId) : "") +
        (p.since ? " since " + fmtDate(new Date(p.since).toISOString().slice(0, 10)) : "") +
        '.</b> The extras above are yours.</p>';
    } else {
      html += '<div class="field"><label>Choose a plan</label>' +
        '<div class="btnrow"><button class="btn block" id="pro-buy-monthly" type="button">Monthly — $4.99 a month</button></div>' +
        '<div class="btnrow"><button class="btn block" id="pro-buy-yearly" type="button">Yearly — $39.99 a year</button></div>' +
        '<div class="btnrow"><button class="btn block" id="pro-buy-lifetime" type="button">Lifetime — $79.99 once, yours forever</button></div></div>';
    }
    html += '<div class="btnrow"><button class="btn secondary block" id="pro-restore" type="button">Restore Purchases</button></div>' +
      '<p class="muted small pro-note">' + (proStoreAvailable() ? "" : "Subscriptions aren't open yet — the Pro products are still being set up in the App Store and Google Play. Check back soon.") + '</p>' +
      '<div class="btnrow"><button class="btn block" data-close type="button">Done</button></div></div>';
    return html;
  }
  function openProPaywall() {
    // Warm the store up while the user reads — initialization may not
    // have run at boot (web preview) or may have thrown; the guard inside
    // proStoreInit keeps this from registering twice.
    proStoreInit();
    openSheet(proPaywallHTML());
    wireClose(sheetHost);
    var m = $("#pro-buy-monthly"); if (m) m.addEventListener("click", function () { proSubscribe("monthly"); });
    var y = $("#pro-buy-yearly"); if (y) y.addEventListener("click", function () { proSubscribe("yearly"); });
    var l = $("#pro-buy-lifetime"); if (l) l.addEventListener("click", function () { proSubscribe("lifetime"); });
    var r = $("#pro-restore"); if (r) r.addEventListener("click", proRestorePurchases);
  }

  /* ---------------- log-a-job sheet ----------------------------------------- */
  function openLogSheet(logId, presetTaskId) {
    var rig = activeRig();
    var existing = logId ? store.logs.find(function (l) { return l.id === logId; }) : null;
    var draft = existing ? JSON.parse(JSON.stringify(existing)) : newLog({ rigId: rig.id, taskId: presetTaskId || null });
    // Tied to a task? The task IS what was done — fill the name in so the
    // user never has to type the same thing twice. Still editable: change
    // it to add detail ("ran it twice") and the edit wins.
    if (!existing && presetTaskId && !draft.title) {
      var preset = store.tasks.find(function (t) { return t.id === presetTaskId; });
      if (preset) draft.title = preset.title;
    }
    var tasks = store.tasks.filter(function (t) { return t.rigId === rig.id; });
    /* Bought for this job already? Bring those parts along — already
       counted, so the same dollars are never counted twice. */
    if (!existing && draft.taskId) {
      partsForRig(rig.id).filter(function (p) { return p.taskId === draft.taskId && p.bought; }).forEach(function (p) {
        if (!draft.parts.some(function (x) { return x.name === p.name; })) {
          draft.parts.push({ name: p.name, partNo: p.partNo || "", cost: Number(p.boughtCost) || 0, counted: false });
        }
      });
    }
    function draw() {
      var deleteArmed = false;
      var partsHtml = draft.parts.map(function (p, i) {
        var row = '<div class="fieldrow" data-part="' + i + '" data-counted="' + (p.counted === false ? "0" : "1") + '">' +
          '<div class="field" style="flex:2;margin-top:.4rem"><input data-pname placeholder="Part — e.g. Oil filter" value="' + esc(p.name || "") + '" /></div>' +
          '<div class="field" style="flex:1.4;margin-top:.4rem"><input data-ppart placeholder="Part no." value="' + esc(p.partNo || "") + '" /></div>' +
          '<div class="field" style="flex:.8;margin-top:.4rem"><input data-pcost inputmode="decimal" placeholder="$" value="' + (p.cost != null && p.cost !== "" ? p.cost : "") + '" /></div></div>';
        if (p.counted === false) row += '<p class="small muted" style="margin:0 0 .4rem">✓ Already in the book — bought for this job, not counted twice.</p>';
        return row;
      }).join("");
      openSheet(
        sheetHead(existing ? "One job, written up" : "Log a job", existing ? "" : "The photo starts the entry — snap the receipt, the part label, or the odometer.") +
        '<button class="photo-btn" id="lj-photo" type="button">📷 Add a photo</button>' +
        '<div class="thumbs" id="lj-thumbs">' + draft.photos.map(function (p, i) {
          return '<span style="position:relative"><img src="' + esc(p.data) + '" alt="Job photo" /><button type="button" data-del-photo="' + i + '" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:none;border-radius:50%;width:1.4rem;height:1.4rem;font-weight:700">×</button></span>';
        }).join("") + '</div>' +
        '<div class="field"><label for="lj-title">What was done</label><input id="lj-title" value="' + esc(draft.title) + '" placeholder="e.g. Generator oil &amp; filter change" /></div>' +
        '<div class="field"><label for="lj-task">Tied to a task in the book (optional)</label><select id="lj-task">' +
        '<option value="">Not tied to a task</option>' +
        tasks.map(function (t) { return '<option value="' + t.id + '"' + (draft.taskId === t.id ? " selected" : "") + '>' + esc(t.title) + '</option>'; }).join("") +
        '</select></div>' +
        '<div class="fieldrow"><div class="field"><label for="lj-date">Date</label><input id="lj-date" type="date" value="' + esc(draft.date) + '" /></div>' +
        '<div class="field"><label for="lj-cost">Cost</label><input id="lj-cost" inputmode="decimal" placeholder="0.00" value="' + (draft.cost ? draft.cost : "") + '" /></div></div>' +
        '<p class="small muted" id="lj-cost-hint"></p>' +
        '<div class="fieldrow"><div class="field"><label for="lj-miles">Odometer (miles)</label><input id="lj-miles" inputmode="decimal" placeholder="' + num(rig.mileage) + '" value="' + (draft.mileage != null ? draft.mileage : "") + '" /></div>' +
        '<div class="field"><label for="lj-gen">Generator hours</label><input id="lj-gen" inputmode="decimal" placeholder="' + num(rig.genHours) + '" value="' + (draft.genHours != null ? draft.genHours : "") + '" /></div></div>' +
        '<div class="field"><label>Parts — what went into it</label>' + partsHtml +
        '<button class="btn small ghost" id="lj-add-part" type="button">＋ Add a part</button></div>' +
        '<div class="field"><label for="lj-note">Note to your future self</label><textarea id="lj-note" placeholder="e.g. Old oil looked clean. Next one at 431 hrs — before the spring trip.">' + esc(draft.note || "") + '</textarea></div>' +
        '<div class="btnrow"><button class="btn block" id="lj-save" type="button">' + (existing ? "Save changes" : "Mark it done — stamp the page") + '</button></div>' +
        (existing ? '<div class="btnrow"><button class="btn ghost block" id="lj-delete" type="button">Delete this entry</button></div>' : "") +
        '<div id="lj-stamp" style="text-align:center;margin-top:1rem" hidden><span class="stamp big pop">Done</span></div>'
      );
      wireClose(sheetHost);
      function costHint() {
        var already = draft.parts.filter(function (p) { return p.counted === false; }).reduce(function (s, p) { return s + (Number(p.cost) || 0); }, 0);
        var el = $("#lj-cost-hint");
        if (el) el.textContent = already ? "Already in the book: " + money(already) + " in parts bought for this job — put only the rest here." : "";
      }
      costHint();
      $("#lj-photo").addEventListener("click", function () {
        if (draft.photos.length >= MAX_PHOTOS_PER_LOG) { toast("That's enough photos for one entry — 12 is the limit."); return; }
        requestPhoto(function (urls) {
          var i = 0, added = 0, stopped = false;
          function finish() { if (added) draw(); }
          (function next() {
            if (stopped || i >= urls.length) { finish(); return; }
            var url = urls[i++];
            downscalePhoto(url).then(function (small) {
              if (draft.photos.length >= MAX_PHOTOS_PER_LOG) { toast("That's enough photos for one entry — 12 is the limit."); stopped = true; finish(); return; }
              if (!storeHasRoom(small.length)) { toast("The book is nearly full — export a copy before adding more photos."); stopped = true; finish(); return; }
              draft.photos.push({ id: uid(), name: "photo", data: small }); added++;
              next();
            });
          })();
        });
      });
      $all("[data-del-photo]", sheetHost).forEach(function (b) {
        b.addEventListener("click", function () { draft.photos.splice(Number(b.getAttribute("data-del-photo")), 1); draw(); });
      });
      $("#lj-task").addEventListener("change", function () {
        // Picking a task fills the name in — unless the user already typed
        // their own wording, or the name still matches the old task's.
        var picked = tasks.find(function (x) { return x.id === $("#lj-task").value; });
        var oldTask = tasks.find(function (x) { return x.id === draft.taskId; });
        var titleEl = $("#lj-title");
        if (picked && (!titleEl.value.trim() || (oldTask && titleEl.value.trim() === oldTask.title))) {
          titleEl.value = picked.title; draft.title = picked.title;
        }
        draft.taskId = $("#lj-task").value || null; // keep the sheet in sync if it re-draws
        if (picked) {
          partsForRig(rig.id).filter(function (p) { return p.taskId === picked.id && p.bought; }).forEach(function (p) {
            if (!draft.parts.some(function (x) { return x.name === p.name; })) {
              draft.parts.push({ name: p.name, partNo: p.partNo || "", cost: Number(p.boughtCost) || 0, counted: false });
            }
          });
          costHint();
        }
      });
      $("#lj-add-part").addEventListener("click", function () {
        collectParts();
        draft.parts.push({ name: "", partNo: "", cost: "" });
        draw();
      });
      function collectParts() {
        $all("[data-part]", sheetHost).forEach(function (rowEl) {
          var i = Number(rowEl.getAttribute("data-part"));
          draft.parts[i] = {
            name: $("[data-pname]", rowEl).value.trim(),
            partNo: $("[data-ppart]", rowEl).value.trim(),
            cost: parseFloat($("[data-pcost]", rowEl).value) || 0,
            counted: rowEl.getAttribute("data-counted") !== "0"
          };
        });
      }
      $("#lj-save").addEventListener("click", function () {
        collectParts();
        draft.taskId = $("#lj-task").value || null;
        draft.title = $("#lj-title").value.trim();
        // Tied to a task and the name left blank (or cleared)? The task
        // name is the job — use it rather than making the user retype it.
        if (!draft.title && draft.taskId) {
          var linked = store.tasks.find(function (t) { return t.id === draft.taskId; });
          if (linked) draft.title = linked.title;
        }
        if (!draft.title) { toast("Give the job a name first."); return; }
        draft.date = $("#lj-date").value || todayISO();
        draft.cost = parseFloat($("#lj-cost").value) || 0;
        draft.mileage = $("#lj-miles").value === "" ? null : Number($("#lj-miles").value);
        draft.genHours = $("#lj-gen").value === "" ? null : Number($("#lj-gen").value);
        draft.note = $("#lj-note").value.trim();
        draft.parts = draft.parts.filter(function (p) { return p.name || p.partNo || p.cost; });
        // Parts add up: if no total was typed, the parts total is the cost.
        var partsTotal = draft.parts.reduce(function (s, p) { return s + (p.counted === false ? 0 : (Number(p.cost) || 0)); }, 0);
        if (!draft.cost && partsTotal) draft.cost = partsTotal;
        if (existing) {
          var idx = store.logs.findIndex(function (l) { return l.id === existing.id; });
          if (idx >= 0) store.logs[idx] = draft;
        } else {
          store.logs.push(draft);
          if (draft.taskId) {
            var task = store.tasks.find(function (t) { return t.id === draft.taskId; });
            if (task) completeTask(task, draft);
          }
          if (draft.mileage != null && draft.mileage > rig.mileage) rig.mileage = draft.mileage;
          if (draft.genHours != null && draft.genHours > rig.genHours) rig.genHours = draft.genHours;
        }
        save(); scheduleReminders();
        var stamp = $("#lj-stamp"); stamp.hidden = false;
        setTimeout(function () { closeSheet(); renderLogbook(); renderHome(); }, 650);
      });
      var del = $("#lj-delete");
      if (del) del.addEventListener("click", function () {
        // Armed two-tap, no confirm(): one tap only arms it ("Tap again
        // to delete"), a second tap deletes. v73 deleted on a confirm()
        // right after a single tap, and a tap on a logbook cost opened
        // this sheet with the delete button right there — too easy to
        // lose a real entry. Deleting is still allowed; it just has to
        // be deliberate.
        if (!deleteArmed) {
          deleteArmed = true;
          del.textContent = "Tap again to delete this entry";
          return;
        }
        store.logs = store.logs.filter(function (l) { return l.id !== existing.id; });
        save(); closeSheet(); renderLogbook();
      });
    }
    draw();
  }

  /* ---------------- Printing ------------------------------------------------ */
  /* A paper copy of a checklist or of what's due — clipboard, pencil, no
     phone in hand. The sheet is built into #print-sheet and the print
     stylesheet hides the app itself, so only the page comes out. */
  function printHead(title, sub) {
    return '<div class="print-head"><h1>' + esc(title) + '</h1><p>' + esc(sub) + '</p></div>';
  }
  function printFoot(note) {
    return '<div class="print-foot"><p>Checked by ______________________&nbsp;&nbsp;Date __________</p><p>' + esc(note) + '</p></div>';
  }
  function printSheet(html) {
    var host = $("#print-sheet");
    if (!host) return;
    host.innerHTML = html;
    if (isNative) {
      /* window.print() does nothing inside the installed app — iOS
         WKWebView has no print dialog (Nov 15: "Print this list
         doesn't work"). Open the sheet in Safari instead, where
         Share → Print works; the book stays put behind it. */
      openPrintPage(html);
      return;
    }
    try { window.print(); } catch (e) {}
  }
  function openPrintPage(html) {
    /* v49 tried a blob link (the download attribute swallowed the tap);
       v50 tried a plain blob link (Safari cannot open a blob: URL from
       outside the web view, so nothing opened either). The sheet now
       travels as a #hash on a real https page — the same plain-link path
       the old guide link used to leave the app for Safari, which is
       proven to work on this phone. print.html carries the print
       styles and the Print button. */
    var a = document.createElement("a");
    a.href = "https://rickdemers.com/rollonrv-preview/print.html#" + encodeURIComponent(html);
    a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); }, 500);
  }
  function printChecklistRun(tpl, run, rig) {
    var rows = [];
    function addGroup(name, items) {
      if (!items.length) return;
      rows.push('<div class="print-group">' + esc(name) + '</div>');
      items.forEach(function (it) {
        var sub = "";
        if (it.psi && rig) sub = (rig.psiFront ? rig.psiFront + " psi front" : "") + (rig.psiFront && rig.psiRear ? " · " : "") + (rig.psiRear ? rig.psiRear + " psi rear" : "");
        rows.push('<div class="print-item"><span class="print-box">' + (run && run.checks[it.id] ? "✓" : "") + '</span><span><span class="print-label">' + esc(it.label) + '</span>' + (sub ? '<span class="print-sub">' + esc(sub) + '</span>' : "") + '</span></div>');
      });
    }
    tpl.groups.forEach(function (g) { addGroup(g.name, g.items.filter(function (it) { return !isItemRemoved(rig.id, tpl.id, it.id); })); });
    addGroup(customHeadingFor(rig.id, tpl.id), customItemsFor(rig.id, tpl.id).map(function (c) { return { id: c.id, label: c.label }; }));
    customGroupsFor(rig.id, tpl.id).forEach(function (g) { addGroup(g.name, g.items); });
    printSheet(
      printHead("RollOnRV — " + tpl.name, rigName(rig) + " · " + fmtDate(todayISO())) +
      rows.join("") +
      '<div class="print-notes"><div class="print-group">Notes</div><div class="print-note-line"></div><div class="print-note-line"></div><div class="print-note-line"></div></div>' +
      printFoot("Mark it with a pen, then log it in the book when you're back inside.")
    );
  }
  function printDueTasks() {
    var rig = activeRig(); if (!rig) return;
    var open = sortOpenTasks(dueTasks(rig).filter(function (d) { return d.status.level !== "done" && d.status.level !== "open"; }), logSort);
    var rows = "";
    var currentGroup = null;
    open.forEach(function (d) {
      if (logSort === "system") {
        var g = d.task.category || "Other";
        if (g !== currentGroup) { currentGroup = g; rows += '<div class="print-group">' + esc(currentGroup) + '</div>'; }
      }
      rows += '<div class="print-item"><span class="print-box"></span><span><span class="print-label">' + esc(d.task.title) + '</span>' +
        '<span class="print-sub">' + esc(d.task.category) + ' · ' + esc(d.status.text) + '</span></span></div>';
    });
    printSheet(
      printHead("RollOnRV — What's due", rigName(rig) + " · " + fmtDate(todayISO())) +
      (rows || '<p class="muted">Nothing on the books — all caught up.</p>') +
      printFoot("Log each one in the book when it's done.")
    );
  }
  /* The downloaded list as a page you can actually read on the phone:
     big type, the logbook look, tick boxes — not Safari's tiny CSV table.
     The spreadsheet file is still there too, under More. */
  function partsListHTML(rig) {
    var all = partsForRig(rig.id);
    var toGet = all.filter(function (p) { return !p.bought; });
    var got = all.filter(function (p) { return p.bought; });
    function row(p, ticked) {
      var sub = [p.partNo, partTaskTitle(p)].filter(Boolean).join(" · ");
      return '<div class="item"><span class="box">' + (ticked ? "✓" : "") + '</span><span><b>' + esc(p.name) + '</b>' + (p.qty > 1 ? ' ×' + p.qty : '') +
        (sub ? '<br><span class="sub">' + esc(sub) + '</span>' : '') +
        (ticked && p.boughtCost ? '<br><span class="sub">' + esc(money(p.boughtCost)) + ' · ' + esc(fmtDate(p.boughtAt)) + '</span>' : '') + '</span></div>';
    }
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Parts to get — ' + esc(rigName(rig)) + '</title><style>' +
      'body{font-family:Georgia,serif;background:#fffdf4;color:#22304a;margin:0;padding:1.2rem;font-size:19px;line-height:1.45}' +
      'h1{font-size:1.7rem;margin:.2rem 0 .1rem}h2{font-size:1.25rem;color:#b3372c;margin:1.4rem 0 .4rem}' +
      '.meta{color:#55617a;font-size:.95rem}.item{display:flex;gap:.8rem;align-items:flex-start;padding:.7rem 0;border-bottom:1px solid #e2d8bd}' +
      '.box{flex:none;width:1.5rem;height:1.5rem;border:2px solid #55617a;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#b3372c}' +
      '.sub{color:#55617a;font-size:.9rem}.foot{color:#55617a;font-size:.9rem;margin-top:1.4rem}' +
      '</style></head><body>' +
      '<h1>Parts to get</h1><p class="meta">' + esc(rigName(rig)) + ' · ' + esc(fmtDate(todayISO())) + '</p>' +
      (toGet.length ? '<h2>To get</h2>' + toGet.map(function (p) { return row(p, false); }).join("") : '<p>Nothing on the list.</p>') +
      (got.length ? '<h2>Already got</h2>' + got.map(function (p) { return row(p, true); }).join("") : '') +
      '<p class="foot">Take it to the counter — check off what you find. · RollOnRV, your rig\'s logbook.</p>' +
      '</body></html>';
  }
  function printPartsList() {
    var rig = activeRig(); if (!rig) return;
    var all = partsForRig(rig.id);
    var toGet = all.filter(function (p) { return !p.bought; });
    var got = all.filter(function (p) { return p.bought; });
    function item(p, ticked) {
      var sub = [p.partNo, partTaskTitle(p)].filter(Boolean).join(" · ");
      return '<div class="print-item"><span class="print-box">' + (ticked ? "✓" : "") + '</span><span><span class="print-label">' + esc(p.name) + (p.qty > 1 ? ' ×' + p.qty : '') + '</span>' +
        (sub ? '<span class="print-sub">' + esc(sub) + '</span>' : "") + '</span></div>';
    }
    printSheet(
      printHead("RollOnRV — Parts to get", rigName(rig) + " · " + fmtDate(todayISO())) +
      (toGet.length ? toGet.map(function (p) { return item(p, false); }).join("") : '<p class="muted">Nothing on the list.</p>') +
      (got.length ? '<div class="print-group">Already got</div>' + got.map(function (p) { return item(p, true); }).join("") : "") +
      printFoot("Take it to the counter — check off what you find.")
    );
  }

  function printStorageList() {
    var rig = activeRig(); if (!rig) return;
    var st = storageFor(rig);
    printSheet(
      printHead("RollOnRV — Where's my stuff?", rigName(rig) + " · " + fmtDate(todayISO())) +
      st.compartments.map(function (c) {
        var items = st.items.filter(function (it) { return it.compartmentId === c.id; });
        return '<div class="print-group">' + esc(c.name) + '</div>' +
          (items.length ? items.map(function (it) {
            return '<div class="print-item"><span class="print-box"></span><span><span class="print-label">' + esc(it.name) + '</span></span></div>';
          }).join("") : '<p class="muted">Nothing in this bay yet.</p>');
      }).join("") +
      printFoot("Every bay, every thing — as named in Find it.")
    );
  }
  /* The printed bay list as a page of its own: each bay a heading, every
     thing under it with a tick box, empty bays shown too — the same list
     the Print button makes, for reading on the phone or on paper. */
  function storageListHTML(rig) {
    var st = storageFor(rig);
    function row(it) {
      return '<div class="item"><span class="box"></span><span><b>' + esc(it.name) + '</b></span></div>';
    }
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Where\'s my stuff? — ' + esc(rigName(rig)) + '</title><style>' +
      'body{font-family:Georgia,serif;background:#fffdf4;color:#22304a;margin:0;padding:1.2rem;font-size:19px;line-height:1.45}' +
      'h1{font-size:1.7rem;margin:.2rem 0 .1rem}h2{font-size:1.25rem;color:#b3372c;margin:1.4rem 0 .4rem}' +
      '.meta{color:#55617a;font-size:.95rem}.item{display:flex;gap:.8rem;align-items:flex-start;padding:.7rem 0;border-bottom:1px solid #e2d8bd}' +
      '.box{flex:none;width:1.5rem;height:1.5rem;border:2px solid #55617a;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#b3372c}' +
      '.sub{color:#55617a;font-size:.9rem}.foot{color:#55617a;font-size:.9rem;margin-top:1.4rem}' +
      '</style></head><body>' +
      '<h1>Where\'s my stuff?</h1><p class="meta">' + esc(rigName(rig)) + ' · ' + esc(fmtDate(todayISO())) + '</p>' +
      st.compartments.map(function (c) {
        var items = st.items.filter(function (it) { return it.compartmentId === c.id; });
        return '<h2>' + esc(c.name) + '</h2>' + (items.length ? items.map(row).join("") : '<p class="sub">Nothing in this bay yet.</p>');
      }).join("") +
      '<p class="foot">Every bay, every thing — as named in Find it. · RollOnRV, your rig\'s logbook.</p>' +
      '</body></html>';
  }

  /* ---------------- task sheet (add / detail) ------------------------------- */
  function openTaskSheet(taskId) {
    var rig = activeRig();
    var task = taskId ? store.tasks.find(function (t) { return t.id === taskId; }) : null;
    if (!task) { openAddTaskSheet(); return; }
    var st = taskStatus(task, rig);
    openSheet(
      sheetHead(esc(task.title), esc(task.category)) +
      '<p><span class="pill ' + (st.level === "overdue" ? "red" : st.level === "soon" ? "amber" : "green") + '">' + esc(st.text) + '</span></p>' +
      (task.note ? '<p>' + esc(task.note) + '</p>' : '') +
      (task.caution ? '<p><b>⚠️ Needs care.</b> Read the guidance below before you start this one.</p>' : '') +
      (task.needsPro ? proLine(task) : '') +
      guidanceHTML(task) +
      '<div class="row"><div class="grow"><div class="title">Every</div><div class="sub">Cadence, when it repeats</div></div><b>' +
      [task.intervalMonths ? task.intervalMonths + " mo" : null, task.intervalMiles ? num(task.intervalMiles) + " mi" : null, task.intervalGenHours ? num(task.intervalGenHours) + " hrs" : null].filter(Boolean).join(" · ") + '</b></div>' +
      (task.lastDoneAt ? '<div class="row"><div class="grow"><div class="title">Last done</div></div><b>' + esc(fmtDate(task.lastDoneAt)) + '</b></div>' : '') +
      '<div class="btnrow"><button class="btn block" id="ts-log">Log this job</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="ts-part">＋ Add a part for this job</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="ts-edit">Edit task</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="ts-snooze">Nudge me again in a week</button>' +
      '<button class="btn ghost block" id="ts-skip">Skip until next due</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="ts-delete">Delete task</button></div>'
    );
    wireClose(sheetHost);
    $("#ts-log").addEventListener("click", function () { closeSheet(); openLogSheet(null, task.id); });
    $("#ts-part").addEventListener("click", function () { closeSheet(); openPartSheet(null, task.id); });
    $("#ts-edit").addEventListener("click", function () { closeSheet(); openEditTaskSheet(task.id); });
    $("#ts-snooze").addEventListener("click", function () { snoozeTask(task); save(); closeSheet(); renderLogbook(); renderHome(); toast("Snoozed a week."); });
    $("#ts-skip").addEventListener("click", function () {
      if (skipTask(task)) { save(); scheduleReminders(); closeSheet(); renderLogbook(); renderHome(); toast("Skipped to next time."); }
      else toast("No rhythm set — change the due date in Edit task.");
    });
    $("#ts-delete").addEventListener("click", function () {
      if (!confirm("Delete this task from the book?")) return;
      store.tasks = store.tasks.filter(function (t) { return t.id !== task.id; });
      save(); scheduleReminders(); closeSheet(); renderLogbook();
    });
  }
  /* Fix a task after the fact — the words, the rhythm, or when it's due.
     What you've already done stays in the book: last-done is history,
     never edited here. Imported categories (Slideouts, AC, …) are kept
     as they are — the list offers them alongside the built-in ones. */
  function openEditTaskSheet(taskId) {
    var rig = activeRig();
    var task = store.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;
    var cats = CATEGORIES.slice();
    if (task.category && cats.indexOf(task.category) === -1) cats.unshift(task.category);
    openSheet(
      sheetHead("Edit task", "Change the words, the rhythm, or when it's due. What you've already done stays in the book.") +
      '<div class="field"><label for="et-title">Task</label><input id="et-title" value="' + esc(task.title) + '" /></div>' +
      '<div class="field"><label for="et-cat">Category</label><select id="et-cat">' + cats.map(function (c) { return '<option' + (c === task.category ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join("") + '</select></div>' +
      '<div class="fieldrow"><div class="field"><label for="et-months">Every (months)</label><input id="et-months" inputmode="numeric" value="' + (task.intervalMonths != null ? task.intervalMonths : "") + '" /></div>' +
      '<div class="field"><label for="et-miles">Every (miles)</label><input id="et-miles" inputmode="numeric" value="' + (task.intervalMiles != null ? task.intervalMiles : "") + '" /></div>' +
      '<div class="field"><label for="et-hours">Every (gen hrs)</label><input id="et-hours" inputmode="numeric" value="' + (task.intervalGenHours != null ? task.intervalGenHours : "") + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="et-due-date">Due date</label><input id="et-due-date" type="date" value="' + esc(task.nextDueDate || "") + '" /></div>' +
      '<div class="field"><label for="et-due-miles">Due at (miles)</label><input id="et-due-miles" inputmode="numeric" value="' + (task.nextDueMileage != null ? task.nextDueMileage : "") + '" /></div></div>' +
      '<div class="field"><label for="et-note">Note</label><textarea id="et-note">' + esc(task.note || "") + '</textarea></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="et-pro" type="button">' + (task.needsPro ? "🔧 Leave it to the pro — this one's for a shop" : "🔧 Leave it to the pro — not for this one") + '</button></div>' +
      '<div id="et-pro-wrap"' + (task.needsPro ? '' : ' hidden') + '>' + proAreaHTML("et", task) + '</div>' +
      '<div class="btnrow"><button class="btn block" id="et-save" type="button">Save changes</button></div>'
    );
    wireClose(sheetHost);
    var etPro = !!task.needsPro;
    wireProArea("et");
    $("#et-pro").addEventListener("click", function () { etPro = !etPro; $("#et-pro").textContent = etPro ? "🔧 Leave it to the pro — this one's for a shop" : "🔧 Leave it to the pro — not for this one"; $("#et-pro-wrap").hidden = !etPro; });
    $("#et-save").addEventListener("click", function () {
      var title = $("#et-title").value.trim();
      if (!title) { toast("Give the task a name first."); return; }
      task.title = title;
      task.category = $("#et-cat").value;
      task.intervalMonths = $("#et-months").value === "" ? null : Number($("#et-months").value);
      task.intervalMiles = $("#et-miles").value === "" ? null : Number($("#et-miles").value);
      task.intervalGenHours = $("#et-hours").value === "" ? null : Number($("#et-hours").value);
      task.nextDueDate = $("#et-due-date").value || null;
      task.nextDueMileage = $("#et-due-miles").value === "" ? null : Number($("#et-due-miles").value);
      task.note = $("#et-note").value.trim();
      var etProPick = etPro ? proFromArea("et") : { proId: null, proShop: "" };
      task.needsPro = etPro;
      task.proId = etProPick.proId;
      task.proShop = etProPick.proShop;
      save(); scheduleReminders(); closeSheet(); renderLogbook(); renderHome(); toast("Task updated.");
    });
  }

  /* The usual jobs — the starter library: jobs most rigs need, rhythms
     already set, the way the big maintenance apps do it. Engine and
     only (Class A/B/C); a towable never sees them. Tapping Add writes the
     job into this rig's book; one already in the book shows as such, so
     a job is never added twice. Set a due date on the task after, or log
     it once and the rhythm takes over from there. */
  function starterApplies(t, rig) {
    if (t.motorized && !/class [abc]/i.test(rig.type || "")) return false;
    if (!t.needs) return true;
    var eq = (rig && rig.equipment) || {};
    // Every answer in `needs` must fit: an exact match, or a missing /
    // "Not sure" answer on the usual job for that question (`isDefault`).
    // A need can name more than one answer — a power or a manual awning
    // both want the same fabric and fastener care — so a list means any
    // of them fits. The generator-fuel answer is the one exception — it
    // only ever hides a job when it names a different fuel outright, so
    // "Not sure" (or unanswered) never hides a fuel job, whatever the
    // plan. The slide-mechanism answer has its own exception: "More
    // than one type" fits every mechanism — big rigs often mix a
    // hydraulic full-wall slide with a Schwintek bedroom slide.
    return Object.keys(t.needs).every(function (key) {
      var ans = eq[key];
      var want = t.needs[key];
      var match = Array.isArray(want) ? want.indexOf(ans) !== -1 : ans === want;
      if (match) return true;
      if (key === "slidetype" && ans === "mixed") return true;
      if (!ans || ans === "unsure") {
        if (key === "genfuel") return true;
        if (t.isDefault) return true;
      }
      return false;
    });
  }
  function starterTasksFor(rig) {
    return STARTER_TASKS.filter(function (t) { return starterApplies(t, rig); });
  }
  function openStarterTasksSheet() {
    var rig = activeRig();
    var list = starterTasksFor(rig);
    function alreadyIn(title) {
      return store.tasks.some(function (t) { return t.rigId === rig.id && t.title.toLowerCase() === title.toLowerCase(); });
    }
    function fitted() {
      return EQUIPMENT_QUESTIONS.some(function (q) { var a = (rig.equipment || {})[q.key]; return a && a !== "unsure"; });
    }
    function draw() {
      var qCount = visibleQuestions(rig, rig.equipment || {}).length;
      openSheet(
        sheetHead("The usual jobs", "Jobs most rigs need, rhythms already set. Tap Add on the ones that fit yours.") +
        '<div class="btnrow"><button class="btn ghost small" id="st-fit" type="button">' + (fitted() ? "Fitted to your rig — change answers" : "⚙️ Fit the jobs to my rig — " + qCount + " quick questions") + '</button></div>' +
        list.map(function (t, i) {
          var every = [t.intervalMonths ? t.intervalMonths + " mo" : null, t.intervalMiles ? num(t.intervalMiles) + " mi" : null, t.intervalGenHours ? t.intervalGenHours + " gen hrs" : null].filter(Boolean).join(" · ");
          return '<div class="row"><div class="grow"><div class="title">' + esc(t.title) + '</div>' +
            '<div class="sub">' + esc(t.category) + (every ? " · every " + every : "") + '</div>' +
            (t.note ? '<div class="sub">' + esc(t.note) + '</div>' : "") + '</div>' +
            (alreadyIn(t.title) ? '<span class="pill green">In the book ✓</span>' :
              '<button class="btn ghost" type="button" data-add-starter="' + i + '">Add</button>') + '</div>';
        }).join("") +
        '<div class="btnrow"><button class="btn block" data-close type="button">Done</button></div>'
      );
      wireClose(sheetHost);
      $("#st-fit").addEventListener("click", function () { closeSheet(); openEquipmentSheet(); });
      $all("[data-add-starter]").forEach(function (b) {
        b.addEventListener("click", function () {
          var t = list[Number(b.getAttribute("data-add-starter"))];
          if (!t || alreadyIn(t.title)) return;
          var note = t.note;
          if (t.title.indexOf("Outside seams") === 0) { var rn = ROOF_NOTES[(rig.equipment || {}).roof]; if (rn) note = rn; }
          if (t.title.indexOf("House batteries") === 0) { var bn = BATTERY_NOTES[(rig.equipment || {}).batteries]; if (bn) note = bn; }
          store.tasks.push(newTask({ rigId: rig.id, title: t.title, category: t.category, intervalMonths: t.intervalMonths, intervalMiles: t.intervalMiles, intervalGenHours: t.intervalGenHours, note: note, needsPro: !!t.needsPro }));
          save(); scheduleReminders(); draw(); renderLogbook(); renderHome();
        });
      });
    }
    draw();
  }

  /* ---------------- prebuilt plans ---------------------------------------- */
  /* Thirteen plans built from seven exported maintenance plans (Nov 16):
     one per rig type, plus six derived from those (Class C diesel, teardrop,
     pop-up, destination trailer, truck camper, toy hauler). The data lives
     in plans.js as PREBUILT_PLANS — titles, components, intervals, caution
     and hire-out flags only. No dates, no odometer readings, no personal
     data of any kind: a plan is a shape, and the first due dates are
     figured out here, from this rig, when it is built. */
  var PLAN_SCHEDULES = [
    ["age", "Estimate based on my RV's age", "Jobs that repeat every few months land about halfway through their rhythm — the rig is partway there already."],
    ["fresh", "Start fresh, as if everything was just serviced", "Every job starts a full rhythm from today."],
    ["spread", "Spread everything across my first 90 days", "Jobs land a few at a time over the next three months, so the first week isn't a wall of work."]
  ];
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  function plansForRig(rig) {
    var all = (typeof PREBUILT_PLANS !== "undefined" ? PREBUILT_PLANS : []);
    if (!rig || !rig.type || rig.type === "Other") return all;
    var fit = all.filter(function (p) { return (p.rigTypes || []).indexOf(rig.type) !== -1; });
    return fit.length ? fit : all;
  }
  function planJobsFor(rig, plan) {
    return (plan.jobs || []).filter(function (j) { return starterApplies(j, rig); });
  }
  /* First due for one plan job, from the starting-schedule choice. Age
     starts a job halfway through its rhythm; fresh starts a full rhythm;
     spread deals the date-based jobs out evenly across 90 days, then
     nudges each one forward to the next chosen maintenance day. Miles
     and generator hours work the same way, from the rig's own readings. */
  function planFirstDue(rig, job, schedule, index, total) {
    var date = null, miles = null, hours = null;
    var today = todayISO();
    if (job.intervalMonths) {
      if (schedule === "spread") {
        var day = Math.floor(index / Math.max(1, total) * 90);
        date = addDaysISO(today, day);
        var days = (rig.maintDays && rig.maintDays.length) ? rig.maintDays : [0, 1, 2, 3, 4, 5, 6];
        var d = new Date(date + "T12:00:00");
        for (var k = 0; k < 7; k++) { if (days.indexOf(d.getDay()) !== -1) break; d.setDate(d.getDate() + 1); }
        date = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      } else {
        var months = schedule === "age" ? Math.max(1, Math.round(job.intervalMonths / 2)) : job.intervalMonths;
        date = addMonthsISO(today, months);
      }
    }
    if (job.intervalMiles) miles = (Number(rig.mileage) || 0) + (schedule === "age" ? Math.round(job.intervalMiles / 2) : job.intervalMiles);
    if (job.intervalGenHours) hours = (Number(rig.genHours) || 0) + (schedule === "age" ? Math.round(job.intervalGenHours / 2) : job.intervalGenHours);
    if (!date && !miles && !hours) date = today;
    return { date: date, miles: miles, hours: hours };
  }
  function buildPlan(rig, plan) {
    var schedule = rig.planSchedule || "spread";
    var jobs = planJobsFor(rig, plan);
    var added = 0, skipped = 0;
    jobs.forEach(function (j, i) {
      var dup = store.tasks.some(function (t) {
        return t.rigId === rig.id && cleanTaskTitle(t.title).toLowerCase() === cleanTaskTitle(j.title).toLowerCase() && t.category === j.category;
      });
      if (dup) { skipped++; return; }
      var due = planFirstDue(rig, j, schedule, i, jobs.length);
      store.tasks.push(newTask({
        rigId: rig.id, title: j.title, category: j.category,
        intervalMonths: j.intervalMonths, intervalMiles: j.intervalMiles, intervalGenHours: j.intervalGenHours,
        needsPro: !!j.pro, caution: !!j.caution, note: j.note,
        nextDueDate: due.date, nextDueMileage: due.miles, nextDueGenHours: due.hours
      }));
      added++;
    });
    save(); scheduleReminders();
    return { added: added, skipped: skipped, total: jobs.length };
  }
  function openPlanChoiceSheet(rig, opts) {
    opts = opts || {};
    var plans = plansForRig(rig);
    openSheet(
      sheetHead("Start with a full plan", "A whole maintenance plan for a rig like yours — every job, rhythms already set. It loads in seconds, and you can take anything out after.") +
      plans.map(function (p, i) {
        return '<div class="row"><div class="grow"><div class="title">' + esc(p.label) + '</div>' +
          '<div class="sub">' + (p.jobs || []).length + ' jobs</div></div>' +
          '<button class="btn ghost" type="button" data-plan="' + i + '">Load</button></div>';
      }).join("") +
      '<div class="btnrow"><button class="btn ghost block" id="plan-empty" type="button">Start empty — I\'ll add jobs myself</button></div>' +
      '<div class="btnrow"><button class="btn secondary block" data-close type="button">Not now</button></div>'
    );
    wireClose(sheetHost);
    $all("[data-plan]").forEach(function (b) {
      b.addEventListener("click", function () {
        var plan = plans[Number(b.getAttribute("data-plan"))];
        closeSheet();
        // What does your rig have? The plan only loads the jobs that fit.
        openEquipmentSheet(function () { openPlanOptionsSheet(rig, plan); });
      });
    });
    $("#plan-empty").addEventListener("click", function () { closeSheet(); if (opts.afterSetup) toast("Empty book — add your first job whenever."); });
  }
  function openPlanOptionsSheet(rig, plan) {
    var days = [0, 1, 2, 3, 4, 5, 6];
    var schedule = "spread";
    function draw() {
      openSheet(
        sheetHead("How should the plan land?", "Two quick choices, then a look before it goes in the book.") +
        '<div class="field"><label>Which days work for maintenance?</label><div class="btnrow">' +
        WEEKDAYS.map(function (d, i) {
          var sel = days.indexOf(i) !== -1;
          return '<button class="btn small ' + (sel ? "" : "ghost") + '" type="button" data-day="' + i + '">' + d.slice(0, 3) + '</button>';
        }).join("") + '</div></div>' +
        '<div class="field"><label>How should we build your starting schedule?</label>' +
        PLAN_SCHEDULES.map(function (s) {
          return '<div class="btnrow"><button class="btn block ' + (schedule === s[0] ? "" : "ghost") + '" type="button" data-sched="' + s[0] + '">' + s[1] + '</button></div>' +
            (schedule === s[0] ? '<p class="small muted">' + s[2] + '</p>' : '');
        }).join("") + '</div>' +
        '<div class="btnrow"><button class="btn block" id="plan-opts-next" type="button">Look before it goes in</button></div>'
      );
      wireClose(sheetHost);
      $all("[data-day]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = Number(b.getAttribute("data-day"));
          if (days.indexOf(i) !== -1) { if (days.length > 1) days = days.filter(function (x) { return x !== i; }); }
          else days.push(i);
          draw();
        });
      });
      $all("[data-sched]").forEach(function (b) {
        b.addEventListener("click", function () { schedule = b.getAttribute("data-sched"); draw(); });
      });
      $("#plan-opts-next").addEventListener("click", function () {
        rig.maintDays = days.slice().sort(); rig.planSchedule = schedule; save();
        closeSheet(); openPlanConfirmSheet(rig, plan);
      });
    }
    draw();
  }
  function openPlanConfirmSheet(rig, plan) {
    var jobs = planJobsFor(rig, plan);
    var systems = {};
    jobs.forEach(function (j) { systems[j.category] = true; });
    var sched = PLAN_SCHEDULES.filter(function (s) { return s[0] === (rig.planSchedule || "spread"); })[0];
    var days = (rig.maintDays || [0, 1, 2, 3, 4, 5, 6]).map(function (i) { return WEEKDAYS[i].slice(0, 3); }).join(", ");
    var rigName = [rig.year, rig.make, rig.model].filter(Boolean).join(" ") || rig.nickname || "Your rig";
    openSheet(
      sheetHead("Your plan is ready to build", "Check it over — nothing goes in the book until you say yes.") +
      '<div class="card"><div class="row"><div class="grow"><div class="title">' + esc(rigName) + '</div><div class="sub">' + esc(rig.type || "") + '</div></div></div>' +
      '<div class="row"><div class="grow"><div class="title">' + esc(plan.label) + '</div><div class="sub">' + jobs.length + ' jobs across ' + Object.keys(systems).length + ' systems</div></div></div>' +
      '<p class="small">' + esc(sched ? sched[1] : "") + '</p>' +
      '<p class="small muted">Maintenance days: ' + esc(days) + '</p></div>' +
      '<div class="btnrow"><button class="btn block" id="plan-build" type="button">Yes, build my plan</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="plan-wrong" type="button">Something is wrong</button></div>'
    );
    wireClose(sheetHost);
    $("#plan-build").addEventListener("click", function () {
      var res = buildPlan(rig, plan);
      closeSheet(); renderLogbook(); renderHome();
      openPlanWelcomeSheet(rig, plan, res);
    });
    $("#plan-wrong").addEventListener("click", function () {
      closeSheet();
      openEquipmentSheet(function () { openPlanOptionsSheet(rig, plan); });
    });
  }
  function openPlanWelcomeSheet(rig, plan, res) {
    var systems = {};
    planJobsFor(rig, plan).forEach(function (j) { systems[j.category] = true; });
    var top = nextUpTasks(rig, 1)[0];
    openSheet(
      sheetHead("Your plan is ready", plan.label + " — " + res.added + " jobs across " + Object.keys(systems).length + " systems, in the book.") +
      (top ? '<div class="card"><div class="sub">Your top priority</div><div class="title">' + esc(top.task.title) + '</div><div class="sub">' + esc(top.task.category) + ' · ' + esc(top.status.text) + '</div></div>' : "") +
      '<div class="btnrow"><button class="btn block" id="plan-do-one" type="button">Do one today</button></div>' +
      '<div class="btnrow"><button class="btn secondary block" data-close type="button">Not now</button></div>'
    );
    wireClose(sheetHost);
    var btn = $("#plan-do-one");
    if (btn) btn.addEventListener("click", function () {
      closeSheet();
      if (top) openTaskSheet(top.task.id); else showScreen("logbook");
    });
  }

  /* The pro picker inside a task sheet: pick one of your pros, or add a
     new one right here — the name, number and town join My pros when the
     task is written in the book. A job from before the list existed
     (a name, no link) opens with the new-pro fields out and the name
     already in them, so one save puts it in the list. */
  function proAreaHTML(prefix, task) {
    var pros = store.pros || [];
    var selId = task && task.proId ? task.proId : "";
    var legacyName = task && !task.proId && task.proShop ? task.proShop : "";
    var startNew = !!legacyName;
    var opts = '<option value="">— Pick one of your pros —</option>' +
      pros.map(function (p) { return '<option value="' + p.id + '"' + (p.id === selId ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join("") +
      '<option value="__new__"' + (startNew ? ' selected' : '') + '>＋ Add a new pro…</option>';
    return '<div id="' + prefix + '-pro-area">' +
      '<div class="field"><label for="' + prefix + '-pro-pick">Which pro?</label><select id="' + prefix + '-pro-pick">' + opts + '</select></div>' +
      '<div id="' + prefix + '-pro-new" hidden>' +
      '<div class="field"><label for="' + prefix + '-pro-name">Name</label><input id="' + prefix + '-pro-name" value="' + esc(legacyName) + '" placeholder="e.g. Bob\'s RV Service" /></div>' +
      '<div class="field"><label for="' + prefix + '-pro-specialty">What they do (optional)</label><input id="' + prefix + '-pro-specialty" placeholder="e.g. Suspension" /></div>' +
      '<div class="fieldrow"><div class="field"><label for="' + prefix + '-pro-phone">Phone (optional)</label><input id="' + prefix + '-pro-phone" inputmode="tel" placeholder="e.g. (850) 555-0134" /></div>' +
      '<div class="field"><label for="' + prefix + '-pro-town">Town (optional)</label><input id="' + prefix + '-pro-town" placeholder="e.g. Panama City" /></div></div>' +
      '<p class="small muted">Saved to My pros when you write the task in the book.</p>' +
      '</div></div>';
  }
  function wireProArea(prefix) {
    var pick = $("#" + prefix + "-pro-pick"), box = $("#" + prefix + "-pro-new");
    pick.addEventListener("change", function () { box.hidden = pick.value !== "__new__"; });
    if (pick.value === "__new__") box.hidden = false;
  }
  function proFromArea(prefix) {
    var pick = $("#" + prefix + "-pro-pick");
    if (pick.value === "__new__") {
      var name = $("#" + prefix + "-pro-name").value.trim();
      if (!name) return { proId: null, proShop: "" };
      var p = newPro({ name: name, specialty: $("#" + prefix + "-pro-specialty").value.trim(), phone: $("#" + prefix + "-pro-phone").value.trim(), town: $("#" + prefix + "-pro-town").value.trim() });
      store.pros = store.pros || []; store.pros.push(p);
      return { proId: p.id, proShop: p.name };
    }
    if (pick.value) {
      var saved = (store.pros || []).find(function (x) { return x.id === pick.value; });
      return { proId: pick.value, proShop: saved ? saved.name : "" };
    }
    return { proId: null, proShop: "" };
  }

  function openAddTaskSheet() {
    var rig = activeRig();
    openSheet(
      sheetHead("Add a task", "Something the rig needs, on a rhythm or just once.") +
      '<div class="field"><label for="at-title">Task</label><input id="at-title" placeholder="e.g. Roof seals — inspect &amp; touch up" /></div>' +
      '<div class="field"><label for="at-cat">Category</label><select id="at-cat">' + CATEGORIES.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + '</select></div>' +
      '<div class="fieldrow"><div class="field"><label for="at-months">Every (months)</label><input id="at-months" inputmode="numeric" placeholder="12" /></div>' +
      '<div class="field"><label for="at-miles">Every (miles)</label><input id="at-miles" inputmode="numeric" placeholder="" /></div>' +
      '<div class="field"><label for="at-hours">Every (gen hrs)</label><input id="at-hours" inputmode="numeric" placeholder="" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="at-due-date">Due date</label><input id="at-due-date" type="date" /></div>' +
      '<div class="field"><label for="at-due-miles">Due at (miles)</label><input id="at-due-miles" inputmode="numeric" placeholder="" /></div></div>' +
      '<div class="field"><label for="at-note">Note</label><textarea id="at-note" placeholder="What to look for, what it takes."></textarea></div>' +
      '<div class="field"><label>Parts needed — what this job takes (optional)</label><div id="at-parts">' +
      '<div class="fieldrow"><div class="field" style="flex:2"><input data-at-pname placeholder="Part — e.g. Oil filter" /></div>' +
      '<div class="field" style="flex:1.4"><input data-at-ppart placeholder="Part no." /></div></div></div>' +
      '<button class="btn small ghost" id="at-add-part" type="button">＋ Add another part</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="at-pro" type="button">🔧 Leave it to the pro — not for this one</button></div>' +
      '<div id="at-pro-wrap" hidden>' + proAreaHTML("at", null) + '</div>' +
      '<div class="btnrow"><button class="btn block" id="at-save" type="button">Write it in the book</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="at-starters" type="button">Or start with the usual jobs</button></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="at-plan" type="button">Or load a prebuilt plan</button></div>'
    );
    wireClose(sheetHost);
    var pro = false;
    wireProArea("at");
    $("#at-pro").addEventListener("click", function () { pro = !pro; $("#at-pro").textContent = pro ? "🔧 Leave it to the pro — this one's for a shop" : "🔧 Leave it to the pro — not for this one"; $("#at-pro-wrap").hidden = !pro; });
    $("#at-starters").addEventListener("click", function () { closeSheet(); openStarterTasksSheet(); });
    $("#at-plan").addEventListener("click", function () { closeSheet(); openPlanChoiceSheet(rig); });
    $("#at-add-part").addEventListener("click", function () {
      var row = document.createElement("div");
      row.className = "fieldrow";
      row.innerHTML = '<div class="field" style="flex:2"><input data-at-pname placeholder="Part — e.g. Oil filter" /></div>' +
        '<div class="field" style="flex:1.4"><input data-at-ppart placeholder="Part no." /></div>';
      $("#at-parts").appendChild(row);
    });
    $("#at-save").addEventListener("click", function () {
      var title = $("#at-title").value.trim();
      if (!title) { toast("Give the task a name first."); return; }
      var proPick = pro ? proFromArea("at") : { proId: null, proShop: "" };
      var task = newTask({
        rigId: rig.id, title: title, category: $("#at-cat").value,
        intervalMonths: $("#at-months").value === "" ? null : Number($("#at-months").value),
        intervalMiles: $("#at-miles").value === "" ? null : Number($("#at-miles").value),
        intervalGenHours: $("#at-hours").value === "" ? null : Number($("#at-hours").value),
        nextDueDate: $("#at-due-date").value || null,
        nextDueMileage: $("#at-due-miles").value === "" ? null : Number($("#at-due-miles").value),
        note: $("#at-note").value.trim(), needsPro: pro,
        proId: proPick.proId, proShop: proPick.proShop
      });
      store.tasks.push(task);
      // Parts named here go straight onto "Parts to get" — not bought
      // yet, tied to this job, so they show up when the job comes due.
      $all("[data-at-pname]").forEach(function (nameEl, i) {
        var name = nameEl.value.trim();
        if (!name) return;
        var noEl = $all("[data-at-ppart]")[i];
        store.parts.push(newPart({ rigId: rig.id, taskId: task.id, name: name, partNo: noEl ? noEl.value.trim() : "" }));
      });
      save(); scheduleReminders();
      closeSheet(); renderLogbook(); toast("Written in the book.");
    });
  }

  /* One part — add it or change it. A part belongs to a job, or it's
     just supplies. "What you paid" is only counted once you've got it. */
  function openPartSheet(partId, presetTaskId) {
    var rig = activeRig();
    var part = partId ? (store.parts || []).find(function (p) { return p.id === partId; }) : null;
    var draft = part ? JSON.parse(JSON.stringify(part)) : newPart({ rigId: rig.id, taskId: presetTaskId || null });
    var tasks = store.tasks.filter(function (t) { return t.rigId === rig.id; });
    openSheet(
      sheetHead(part ? "One part" : "Add a part", "What you need, which job it's for, and what you paid when you've got it.") +
      '<div class="field"><label for="pp-name">Part or supply</label><input id="pp-name" value="' + esc(draft.name) + '" placeholder="e.g. Oil filter" /></div>' +
      '<div class="fieldrow"><div class="field"><label for="pp-no">Part no. (optional)</label><input id="pp-no" value="' + esc(draft.partNo || "") + '" placeholder="e.g. LF16035" /></div>' +
      '<div class="field"><label for="pp-qty">How many</label><input id="pp-qty" inputmode="numeric" value="' + draft.qty + '" /></div></div>' +
      '<div class="field"><label for="pp-task">For which job (optional)</label><select id="pp-task"><option value="">Just supplies — no job</option>' +
      tasks.map(function (t) { return '<option value="' + t.id + '"' + (draft.taskId === t.id ? " selected" : "") + '>' + esc(t.title) + '</option>'; }).join("") + '</select></div>' +
      '<div class="field"><label for="pp-price">What you paid</label><input id="pp-price" inputmode="decimal" placeholder="0.00" value="' + (draft.boughtCost ? draft.boughtCost : "") + '" /></div>' +
      '<div class="btnrow"><button class="btn ghost block" id="pp-bought" type="button">' + (draft.bought ? "✓ Got it" : "Not got yet — tap when you've got it") + '</button></div>' +
      '<div class="btnrow"><button class="btn block" id="pp-save" type="button">Write it on the list</button></div>' +
      (part ? '<div class="btnrow"><button class="btn ghost block" id="pp-delete" type="button">Take it off the list</button></div>' : "")
    );
    wireClose(sheetHost);
    $("#pp-bought").addEventListener("click", function () {
      draft.bought = !draft.bought;
      this.textContent = draft.bought ? "✓ Got it" : "Not got yet — tap when you've got it";
    });
    $("#pp-save").addEventListener("click", function () {
      var name = $("#pp-name").value.trim();
      if (!name) { toast("Give the part a name first."); return; }
      draft.name = name;
      draft.partNo = $("#pp-no").value.trim();
      draft.qty = Math.max(1, Number($("#pp-qty").value) || 1);
      draft.taskId = $("#pp-task").value || null;
      draft.boughtCost = parseFloat($("#pp-price").value) || 0;
      if (draft.bought && !draft.boughtAt) draft.boughtAt = todayISO();
      if (!draft.bought) draft.boughtAt = null;
      if (part) { var i = store.parts.findIndex(function (p) { return p.id === part.id; }); store.parts[i] = draft; }
      else store.parts.push(draft);
      save(); closeSheet(); renderParts(); renderHome(); toast("On the list.");
    });
    var del = $("#pp-delete");
    if (del) del.addEventListener("click", function () {
      if (!confirm("Take this part off the list?")) return;
      store.parts = store.parts.filter(function (p) { return p.id !== part.id; });
      save(); closeSheet(); renderParts(); renderHome();
    });
  }

  /* ---------------- tire sheet ---------------------------------------------- */
  function openTireSheet(tireId) {
    var rig = activeRig();
    var tire = tireId ? store.tires.find(function (t) { return t.id === tireId; }) : null;
    var draft = tire ? JSON.parse(JSON.stringify(tire)) : newTire({ rigId: rig.id });
    /* The age preview under the DOT field, updated in place as you type.
       The field itself is never rebuilt, so the keyboard stays up and
       focus never leaves while you type the four digits. */
    function ageHtml() {
      var info = dotInfo(draft.dotCode);
      return info.ok
        ? '<div class="card"><div class="age">' + esc(info.ageText) + '</div><p>' + esc(info.flagText) + '</p><div class="tire-bar"><div class="' + (info.flag === "good" ? "green" : info.flag === "old" ? "amber" : "red") + '" style="width:' + info.pctToTen + '%"></div></div><p class="small muted">The bar fills toward 10 years — the hard limit.</p></div>'
        : '<p class="muted">' + esc(info.text) + '</p>';
    }
    function draw() {
      openSheet(
        sheetHead(tire ? "Tire — " + esc(tire.position || "") : "Add a tire", "The DOT code is the last four digits on the sidewall — week, then year. 3222 means week 32 of 2022.") +
        '<div class="field"><label for="ti-pos">Position</label><input id="ti-pos" list="ti-positions" value="' + esc(draft.position) + '" placeholder="e.g. Steer — left" />' +
        '<datalist id="ti-positions"><option>Steer — left</option><option>Steer — right</option><option>Drive — outer left</option><option>Drive — outer right</option><option>Drive — inner left</option><option>Drive — inner right</option><option>Tag — left</option><option>Tag — right</option><option>Spare</option></datalist></div>' +
        '<div class="field"><label for="ti-dot">DOT code (last 4 digits)</label><input id="ti-dot" inputmode="numeric" maxlength="4" value="' + esc(draft.dotCode) + '" placeholder="3222" /></div>' +
        '<div id="ti-age">' + ageHtml() + '</div>' +
        '<div class="field"><label for="ti-note">Note</label><input id="ti-note" value="' + esc(draft.note || "") + '" placeholder="e.g. Michelin, bought at..." /></div>' +
        '<div class="btnrow"><button class="btn block" id="ti-save" type="button">Save tire</button></div>' +
        (tire ? '<div class="btnrow"><button class="btn ghost block" id="ti-delete" type="button">Remove tire</button></div>' : "")
      );
      wireClose(sheetHost);
      $("#ti-dot").addEventListener("input", function () { draft.dotCode = $("#ti-dot").value; $("#ti-age").innerHTML = ageHtml(); });
      $("#ti-save").addEventListener("click", function () {
        draft.position = $("#ti-pos").value.trim() || "Tire";
        draft.dotCode = $("#ti-dot").value.trim();
        draft.note = $("#ti-note").value.trim();
        if (!dotInfo(draft.dotCode).ok) { toast("Check the DOT code — four digits, week then year."); return; }
        if (tire) { var i = store.tires.findIndex(function (t) { return t.id === tire.id; }); store.tires[i] = draft; }
        else store.tires.push(draft);
        save(); closeSheet(); renderTires(); toast("Tire written in the book.");
      });
      var del = $("#ti-delete");
      if (del) del.addEventListener("click", function () {
        if (!confirm("Remove this tire from the book?")) return;
        store.tires = store.tires.filter(function (t) { return t.id !== tire.id; });
        save(); closeSheet(); renderTires();
      });
    }
    draw();
  }

  /* ---------------- rig sheets ---------------------------------------------- */
  function openRigSheet() {
    var rig = activeRig();
    var fuel = (rig.equipment && rig.equipment.fuel) || "";
    openSheet(
      sheetHead("Your rig", "The numbers the book does its math from.") +
      '<div class="field"><label>Your rig\u2019s photo</label><div id="rg-photo-preview">' + rigArt(rig) + '</div>' +
      '<div class="btnrow" style="margin-top:.5rem"><button class="btn small" id="rg-photo-change" type="button">📷 ' + (rig.photo ? 'Change photo' : 'Add a photo') + '</button>' +
      (rig.photo ? '<button class="btn small ghost" id="rg-photo-remove" type="button">Remove photo</button>' : '') + '</div></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-year">Year</label><input id="rg-year" value="' + esc(rig.year) + '" /></div>' +
      '<div class="field"><label for="rg-make">Make</label><input id="rg-make" value="' + esc(rig.make) + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-model">Model</label><input id="rg-model" value="' + esc(rig.model) + '" /></div>' +
      '<div class="field"><label for="rg-type">Type</label><select id="rg-type">' + ["Class A", "Class B", "Class C", "Travel trailer", "Fifth wheel", "Truck camper", "Other"].map(function (t) { return '<option' + (rig.type === t ? " selected" : "") + '>' + t + '</option>'; }).join("") + '</select></div></div>' +
      '<div class="rig-art rig-art--sm" id="rg-type-art" aria-hidden="true"></div>' +
      '<div class="field" id="rg-fuel-field"><label for="rg-fuel">Engine — gas or diesel?</label><select id="rg-fuel">' +
      '<option value="">Not sure</option>' +
      '<option value="gas"' + (fuel === "gas" ? " selected" : "") + '>Gas</option>' +
      '<option value="diesel"' + (fuel === "diesel" ? " selected" : "") + '>Diesel</option></select></div>' +
      '<div class="field"><label for="rg-nick">Nickname</label><input id="rg-nick" value="' + esc(rig.nickname || "") + '" /></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-miles">Odometer (miles)</label><input id="rg-miles" inputmode="decimal" value="' + rig.mileage + '" /></div>' +
      '<div class="field"><label for="rg-gen">Generator hours</label><input id="rg-gen" inputmode="decimal" value="' + rig.genHours + '" /></div></div>' +
      '<div class="fieldrow"><div class="field"><label for="rg-psi-f">Tire pressure — front (PSI)</label><input id="rg-psi-f" inputmode="numeric" value="' + (rig.psiFront || "") + '" /></div>' +
      '<div class="field"><label for="rg-psi-r">Tire pressure — rear (PSI)</label><input id="rg-psi-r" inputmode="numeric" value="' + (rig.psiRear || "") + '" /></div></div>' +
      '<div class="btnrow"><button class="btn block" id="rg-save" type="button">Save rig</button></div>'
    );
    wireClose(sheetHost);
    function updateRgArt() { $("#rg-type-art").innerHTML = rigSilhouette($("#rg-type").value); $("#rg-fuel-field").style.display = /class [abc]/i.test($("#rg-type").value) ? "" : "none"; }
    $("#rg-type").addEventListener("change", updateRgArt);
    updateRgArt();
    $("#rg-photo-change").addEventListener("click", function () { pickRigPhoto(); closeSheet(); });
    var rgRemove = $("#rg-photo-remove");
    if (rgRemove) rgRemove.addEventListener("click", function () {
      if (rgRemove.textContent !== "Tap again to remove") { rgRemove.textContent = "Tap again to remove"; return; }
      rig.photo = null; save(); closeSheet(); renderHome(); renderMore(); toast("Photo removed — the silhouette is back.");
    });
    $("#rg-save").addEventListener("click", function () {
      rig.year = $("#rg-year").value.trim(); rig.make = $("#rg-make").value.trim();
      rig.model = $("#rg-model").value.trim(); rig.type = $("#rg-type").value;
      rig.nickname = $("#rg-nick").value.trim();
      // Engine fuel lives on the rig, not in the question poll — and a
      // trailer has no engine, so a type change clears a stale answer.
      rig.equipment = rig.equipment || {};
      var f = $("#rg-fuel").value;
      if (f && /class [abc]/i.test(rig.type)) rig.equipment.fuel = f;
      else delete rig.equipment.fuel;
      rig.mileage = Number($("#rg-miles").value) || 0; rig.genHours = Number($("#rg-gen").value) || 0;
      rig.psiFront = Number($("#rg-psi-f").value) || null; rig.psiRear = Number($("#rg-psi-r").value) || null;
      save(); closeSheet(); renderMore(); renderHome(); toast("Rig updated.");
    });
  }
  function openMilesSheet() {
    var rig = activeRig();
    openSheet(
      sheetHead("Update odometer &amp; hours", "The book's due dates and cost-per-mile run off these numbers.") +
      '<div class="field"><label for="mi-miles">Odometer (miles)</label><input id="mi-miles" inputmode="decimal" value="' + rig.mileage + '" /></div>' +
      '<div class="field"><label for="mi-gen">Generator hours</label><input id="mi-gen" inputmode="decimal" value="' + rig.genHours + '" /></div>' +
      '<div class="btnrow"><button class="btn block" id="mi-save" type="button">Save numbers</button></div>'
    );
    wireClose(sheetHost);
    $("#mi-save").addEventListener("click", function () {
      rig.mileage = Number($("#mi-miles").value) || 0; rig.genHours = Number($("#mi-gen").value) || 0;
      save(); closeSheet(); renderHome(); toast("Numbers updated.");
    });
  }

  /* ---------------- wiring --------------------------------------------------- */
  function wire() {
    $all("#tabbar .tab").forEach(function (t) {
      t.addEventListener("click", function () { showScreen(t.getAttribute("data-screen")); });
    });
    $("#setup-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var rig = newRig({
        year: $("#su-year").value.trim(), make: $("#su-make").value.trim(), model: $("#su-model").value.trim(),
        nickname: $("#su-nick").value.trim(), type: $("#su-type").value,
        mileage: $("#su-miles").value, genHours: $("#su-gen").value,
        psiFront: $("#su-psi-f").value, psiRear: $("#su-psi-r").value,
        equipment: $("#su-fuel").value ? { fuel: $("#su-fuel").value } : {}
      });
      if (!rig.year && !rig.make && !rig.model) { toast("Tell the book what rig this is — year, make, or model."); return; }
      store.rigs.push(rig); store.activeRigId = rig.id;
      // Tasks imported before the rig existed attach to it now.
      store.tasks.forEach(function (t) { if (t.rigId === "pending") t.rigId = rig.id; });
      save();
      $("#tabbar").style.display = "";
      showScreen("home");
      // A new rig starts empty — offer a full prebuilt plan before
      // anything else. Starting empty is one tap away on the same sheet.
      openPlanChoiceSheet(rig, { afterSetup: true });
    });
    // Engine fuel only makes sense on a motorhome — a trailer has no engine.
    function updateSuFuel() { $("#su-fuel-field").style.display = /class [abc]/i.test($("#su-type").value) ? "" : "none"; }
    $("#su-type").addEventListener("change", function () { $("#setup-type-art").innerHTML = rigSilhouette($("#su-type").value); updateSuFuel(); });
    $("#setup-type-art").innerHTML = rigSilhouette($("#su-type").value);
    updateSuFuel();
    $("#setup-import-btn").addEventListener("click", function () { $("#csv-file-input").click(); });
    $("#home-start-checklist").addEventListener("click", function () { showScreen("checklists"); openChecklistRun("pretrip"); });
    $("#home-rig-art").addEventListener("click", pickRigPhoto);
    $("#home-rig-photo-btn").addEventListener("click", pickRigPhoto);
    $("#home-guide-link").addEventListener("click", function () { showScreen("guide"); });
    $("#guide-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#home-pick-checklist").addEventListener("click", function () { showScreen("checklists"); });
    $("#home-update-miles").addEventListener("click", openMilesSheet);
    $("#home-log-job").addEventListener("click", function () { openLogSheet(null, null); });
    $("#log-add-btn").addEventListener("click", function () { openLogSheet(null, null); });
    $("#log-print-btn").addEventListener("click", function () { printDueTasks(); });
    $("#home-search").addEventListener("input", function (e) { homeSearchQuery = e.target.value.trim().toLowerCase(); renderHomeSearch(); });
    $("#log-add-task-btn").addEventListener("click", openAddTaskSheet);
    $("#tire-add-btn").addEventListener("click", function () { openTireSheet(null); });
    $("#parts-add-btn").addEventListener("click", function () { openPartSheet(null, null); });
    $("#parts-print-btn").addEventListener("click", function () { printPartsList(); });
    $("#parts-csv-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-parts.html", partsListHTML(rig), "text/html;charset=utf-8");
      toast("Opened in a new tab — the app is still here behind it.");
    });
    $("#parts-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#parts-back-btn-bottom").addEventListener("click", function () { showScreen("home"); });
    $("#pros-open-btn").addEventListener("click", function () { showScreen("pros"); });
    $("#storage-open-btn").addEventListener("click", function () { showScreen("storage"); });
    $("#storage-add-btn").addEventListener("click", function () { openStorageItemSheet(null, null); });
    $("#storage-bay-btn").addEventListener("click", function () { openStorageCompartmentSheet(null); });
    $("#storage-print-btn").addEventListener("click", function () { printStorageList(); });
    $("#storage-search").addEventListener("input", function (e) { storageSearchQuery = e.target.value.trim().toLowerCase(); renderStorage(); });
    $("#storage-back-btn").addEventListener("click", function () { showScreen("more"); });
    $("#storage-back-btn-bottom").addEventListener("click", function () { showScreen("more"); });
    $("#reminders-open-btn").addEventListener("click", openRemindersSheet);
    $("#premium-open-btn").addEventListener("click", openProPaywall);
    $("#pros-add-btn").addEventListener("click", function () { openProSheet(null); });
    $("#pros-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#pros-back-btn-bottom").addEventListener("click", function () { showScreen("home"); });
    $("#fuel-add-btn").addEventListener("click", function () { openFuelSheet(null); });
    $("#fuel-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#fuel-back-btn-bottom").addEventListener("click", function () { showScreen("home"); });
    $("#trips-add-btn").addEventListener("click", function () { openTripSheet(null); });
    $("#trips-back-btn").addEventListener("click", function () { showScreen("home"); });
    $("#trips-back-btn-bottom").addEventListener("click", function () { showScreen("home"); });
    $("#rig-edit-btn").addEventListener("click", openRigSheet);
    $("#rig-equipment-btn").addEventListener("click", openEquipmentSheet);
    $("#csv-import-btn").addEventListener("click", function () { $("#csv-file-input").click(); });
    $("#csv-file-input").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var rig = activeRig();
        var rigId = rig ? rig.id : "pending";
        var res = importTasksCSV(String(reader.result || ""), rigId);
        save();
        var msg = res.imported + " task" + (res.imported === 1 ? "" : "s") + " written in the book" +
          (res.skipped ? " · " + res.skipped + " row" + (res.skipped === 1 ? "" : "s") + " skipped" : "") +
          (res.errors.length ? " — " + res.errors[0] : "") + ".";
        $("#csv-status").textContent = msg;
        if (rig) { renderMore(); renderLogbook(); } else toast(msg + " Now add your rig and they'll attach to it.");
      };
      reader.readAsText(file);
      e.target.value = "";
    });
    $("#csv-export-tasks-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-tasks.csv", exportTasksCSV(rig.id));
      toast("Tasks exported — rollonrv-tasks.csv");
    });
    $("#csv-export-logs-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-logbook.csv", exportLogsCSV(rig.id));
      toast("Logbook exported — rollonrv-logbook.csv");
    });
    $("#csv-export-parts-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-parts.csv", exportPartsCSV(rig.id));
      toast("Parts list exported — rollonrv-parts.csv");
    });
    $("#csv-export-fuel-btn").addEventListener("click", function () {
      var rig = activeRig(); if (!rig) return;
      downloadFile("rollonrv-fuel.csv", exportFuelCSV(rig.id));
      toast("Fuel log exported — rollonrv-fuel.csv");
    });
    $all(".theme-btn").forEach(function (b) {
      b.addEventListener("click", function () { setTheme(currentTheme() === "dark" ? "light" : "dark"); });
    });
    $("#reset-btn").addEventListener("click", function () {
      if (!confirm("Erase the whole book — rig, tasks, log entries, tires, everything? Export a CSV first if you want to keep it.")) return;
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    });
    $("#photo-input").addEventListener("change", function (e) {
      /* The picker offers several photos at once now (Nov 15: it only
         ever offered one). Read every chosen file, in order, and hand
         the whole batch to whoever is waiting for photos. */
      var files = e.target.files ? Array.prototype.slice.call(e.target.files) : [];
      var cb = photoPending; photoPending = null;
      if (!files.length || !cb) return;
      var urls = [], i = 0;
      (function readNext() {
        if (i >= files.length) { cb(urls); return; }
        var reader = new FileReader();
        reader.onload = function () { urls.push(String(reader.result || "")); i++; readNext(); };
        reader.onerror = function () { i++; readNext(); };
        reader.readAsDataURL(files[i]);
      })();
      e.target.value = "";
    });
  }

  /* ---------------- init ------------------------------------------------------ */
  /* ---------------- night mode -------------------------------------------- */
  /* Opt-in, like the Bible study — a button, never the phone's dark mode.
     Light is the default; the choice is saved per device. */
  var THEME_KEY = "rollonrv-theme";
  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"; }
    catch (e) { return "light"; }
  }
  function setTheme(mode) {
    var dark = mode === "dark";
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (e) {}
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    $all(".theme-btn").forEach(function (b) { b.textContent = dark ? "☀️ Day mode" : "🌙 Night mode"; });
  }

  function init() {
    load();
    setTheme(currentTheme());
    wire();
    if (!store.rigs.length) {
      $("#tabbar").style.display = "none";
      $all(".screen").forEach(function (s) { s.classList.remove("active"); });
      $("#screen-setup").classList.add("active");
    } else {
      $("#tabbar").style.display = "";
      showScreen("home");
    }
    scheduleReminders();
    proStoreInit();
  }

  /* ---------------- test hooks (not shipped UI — used by tests/test.js) ------ */
  window.RollOnRV = {
    store: function () { return store; },
    save: save, load: load,
    newRig: newRig, newTask: newTask, newLog: newLog, newTire: newTire, newPart: newPart,
    partsForRig: partsForRig, togglePartBought: togglePartBought, boughtPartsCostForTask: boughtPartsCostForTask,
    exportPartsCSV: exportPartsCSV, printPartsList: printPartsList, partsListHTML: partsListHTML, renderParts: renderParts, openPartSheet: openPartSheet,
    renderStorage: renderStorage, storageFor: storageFor, storageSearch: storageSearch,
    storageStarterCompartments: storageStarterCompartments, openStorageItemSheet: openStorageItemSheet, openStorageCompartmentSheet: openStorageCompartmentSheet,
    printStorageList: printStorageList, storageListHTML: storageListHTML,
    taskStatus: taskStatus, dueTasks: dueTasks, completeTask: completeTask, snoozeTask: snoozeTask, skipTask: skipTask, openTaskSheet: openTaskSheet,
    planReminders: planReminders, reminderSettings: reminderSettings, scheduleReminders: scheduleReminders, openRemindersSheet: openRemindersSheet,
    dotInfo: dotInfo, costsForYear: costsForYear, costPerMile: costPerMile,
    importTasksCSV: importTasksCSV, exportTasksCSV: exportTasksCSV, exportLogsCSV: exportLogsCSV, dedupeTasks: dedupeTasks,
    exportFuelCSV: exportFuelCSV, fuelStats: fuelStats, fuelMpg: fuelMpg, fuelForRig: fuelForRig,
    tripCosts: tripCosts, tripsForRig: tripsForRig,
    cleanTaskTitle: cleanTaskTitle,
    parseCSV: parseCSV, CHECKLISTS: CHECKLISTS, STARTER_TASKS: STARTER_TASKS, CATEGORIES: CATEGORIES, TIPS: TIPS,
    GUIDANCE: GUIDANCE, guidanceFor: guidanceFor,
    getPremium: getPremium, isPro: isPro, grantPremium: grantPremium,
    proStoreAvailable: proStoreAvailable, proStoreInit: proStoreInit,
    proStoreWaitReady: proStoreWaitReady,
    proStoreState: function () { return { initialized: proStoreInitialized, ready: proStoreReadyFired, initSettled: proStoreInitSettled, diag: proStoreDiag }; },
    proSubscribe: proSubscribe, proRestorePurchases: proRestorePurchases,
    proPaywallHTML: proPaywallHTML, openProPaywall: openProPaywall,
    proRecheckOwnership: proRecheckOwnership, proProductIdFromReceipt: proProductIdFromReceipt,
    plansForRig: plansForRig, planJobsFor: planJobsFor, buildPlan: buildPlan, planFirstDue: planFirstDue,
    openPlanChoiceSheet: openPlanChoiceSheet, openPlanOptionsSheet: openPlanOptionsSheet,
    openPlanConfirmSheet: openPlanConfirmSheet, openPlanWelcomeSheet: openPlanWelcomeSheet,
    openEquipmentSheet: openEquipmentSheet, openStarterTasksSheet: openStarterTasksSheet, openAddTaskSheet: openAddTaskSheet,
    PREBUILT_PLANS: (typeof PREBUILT_PLANS !== "undefined" ? PREBUILT_PLANS : []),
    PRO_PRODUCT_IDS: PRO_PRODUCT_IDS, PRO_PRICES: PRO_PRICES, PRO_CONFIG: PRO_CONFIG,
    rigSilhouette: rigSilhouette, setRigPhoto: setRigPhoto,
    photoPendingSet: function () { return !!photoPending; },
    setTheme: setTheme, currentTheme: currentTheme,
    printChecklistRun: printChecklistRun, printDueTasks: printDueTasks,
    nextUpTasks: nextUpTasks,
    sortOpenTasks: sortOpenTasks,
    currentLogSort: function () { return logSort; },
    showScreen: showScreen, renderHome: renderHome, renderLogbook: renderLogbook,
    renderChecklists: renderChecklists, renderTires: renderTires, renderMore: renderMore,
    activeRig: activeRig, isNative: isNative, platform: platform
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();


