
export type ActivityCategory = 'walk' | 'bodyweight' | 'stretch' | 'stairs' | 'dance' | 'chores' | 'cardio';

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  intensity: 1 | 2 | 3;
  durationMinutes: number;
  indoor: boolean;
  outdoor: boolean;
  description: string;
  tip: string;
  whyItWorks: string;
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'walk-easy',
    name: 'Easy walk',
    category: 'walk',
    intensity: 1,
    durationMinutes: 10,
    indoor: true,
    outdoor: true,
    description: 'A relaxed, conversational-pace walk around the block or on a treadmill.',
    tip: 'Good right after eating, since walking uses glucose without dropping you fast, so it pairs well with a smaller dose reduction.',
    whyItWorks:
      'Working muscles pull glucose out of your blood to use as fuel through a pathway that doesn’t need much insulin to work, so moving around gives your body a second way to use up glucose besides the insulin you took less of.',
  },
  {
    id: 'walk-brisk',
    name: 'Brisk walk',
    category: 'walk',
    intensity: 2,
    durationMinutes: 20,
    indoor: true,
    outdoor: true,
    description: 'A purposeful walk fast enough that talking takes a bit more effort.',
    tip: 'Bring fast-acting carbs, since a brisk pace uses more glucose, and that adds up with less insulin on board.',
    whyItWorks:
      'A faster pace means your leg muscles are contracting harder and more often, which pulls in glucose faster than an easy walk. Useful for a bigger gap, but it also means glucose can drop faster than you expect.',
  },
  {
    id: 'walk-hills',
    name: 'Hilly or incline walk',
    category: 'walk',
    intensity: 3,
    durationMinutes: 25,
    indoor: true,
    outdoor: true,
    description: 'A walk with hills, stairs built in, or a treadmill incline.',
    tip: 'The extra effort from an incline pulls glucose down faster than flat walking, so check your glucose partway through.',
    whyItWorks:
      'Pushing uphill recruits more muscle fibers at once than flat ground, so more of your body is pulling in glucose simultaneously. It closes a larger gap, but for the same reason it’s the least predictable option here.',
  },
  {
    id: 'bw-light',
    name: 'Light stretching circuit',
    category: 'bodyweight',
    intensity: 1,
    durationMinutes: 10,
    indoor: true,
    outdoor: false,
    description: 'Slow bodyweight stretches (hamstrings, shoulders, hips) held for 20-30 seconds each.',
    tip: 'Very low intensity, mostly useful for a small dose reduction or when you want something with almost no hypo risk.',
    whyItWorks:
      'Held stretches use very little muscle energy compared to actual movement, so this barely touches glucose on its own. Its real value is being gentle enough to do with almost no hypo risk while you wait to see how a small gap plays out.',
  },
  {
    id: 'bw-circuit',
    name: 'Bodyweight circuit',
    category: 'bodyweight',
    intensity: 2,
    durationMinutes: 15,
    indoor: true,
    outdoor: true,
    description: 'A few rounds of squats, push-ups, and lunges at a steady, unhurried pace.',
    tip: 'Muscle activity pulls glucose in for hours afterward, not just during, worth knowing if you tend to dip later.',
    whyItWorks:
      'Working muscles restock their internal glucose stores (glycogen) after you stop, not just while you’re moving. That’s why a circuit like this keeps pulling glucose in for a while afterward, not only during the 15 minutes itself.',
  },
  {
    id: 'bw-hiit',
    name: 'Fast bodyweight intervals',
    category: 'bodyweight',
    intensity: 3,
    durationMinutes: 15,
    indoor: true,
    outdoor: true,
    description: 'Short bursts of jumping jacks, burpees, or high-knees with brief rests between.',
    tip: 'Vigorous intervals can spike glucose briefly before dropping it, so check in afterward, not just during.',
    whyItWorks:
      'Very intense effort triggers a short burst of stress hormones (adrenaline) that can push glucose up first, before the muscle activity itself pulls it back down: a two-phase effect that makes this less predictable than steadier options.',
  },
  {
    id: 'stairs-easy',
    name: 'A few flights of stairs',
    category: 'stairs',
    intensity: 1,
    durationMinutes: 5,
    indoor: true,
    outdoor: false,
    description: 'Walking up and down a couple flights of stairs at a comfortable pace.',
    tip: 'A quick option when you only have a few minutes and a small gap to cover.',
    whyItWorks:
      'Climbing engages your leg muscles more than flat walking even at a comfortable pace, so a few minutes of stairs uses noticeably more glucose than the same time spent walking on level ground.',
  },
  {
    id: 'stairs-repeats',
    name: 'Stair repeats',
    category: 'stairs',
    intensity: 3,
    durationMinutes: 15,
    indoor: true,
    outdoor: false,
    description: 'Repeated trips up and down a stairwell at a brisk pace.',
    tip: 'One of the more intense options here, so make sure you have a way to test glucose nearby.',
    whyItWorks:
      'Sustained, repeated climbing keeps your leg muscles under continuous load, which uses glucose steadily and substantially the whole time. Effective for a large gap, but also one of the faster-acting options here.',
  },
  {
    id: 'dance-casual',
    name: 'Dance around to a few songs',
    category: 'dance',
    intensity: 2,
    durationMinutes: 15,
    indoor: true,
    outdoor: false,
    description: 'Free-form dancing to a short playlist, as much or as little effort as feels good.',
    tip: 'Easy to keep light or push harder, so it naturally scales with how big the gap is.',
    whyItWorks:
      'Dancing is just continuous, varied muscle movement. The more of your body is moving and the more energetically, the more glucose your muscles pull in, so this scales up or down with however much effort you put in.',
  },
  {
    id: 'chores-active',
    name: 'Active chores',
    category: 'chores',
    intensity: 1,
    durationMinutes: 20,
    indoor: true,
    outdoor: true,
    description: 'Vacuuming, sweeping, yard work, or other chores that keep you moving the whole time.',
    tip: 'A practical way to fold activity into something you were going to do anyway.',
    whyItWorks:
      'Any sustained light movement adds up the same way a light walk does: gentle, steady muscle use spread over a longer stretch of time rather than one concentrated burst.',
  },
  {
    id: 'chores-yard',
    name: 'Yard work',
    category: 'chores',
    intensity: 2,
    durationMinutes: 25,
    indoor: false,
    outdoor: true,
    description: 'Raking, digging, mowing, or other yard work with sustained effort.',
    tip: 'Weather and heat add to how fast this can lower glucose, so drink water and check in periodically.',
    whyItWorks:
      'This combines sustained arm and leg effort with being outdoors in the heat, and heat itself increases blood flow to muscles and skin. Both effects independently speed up how fast glucose gets used.',
  },
  {
    id: 'stretch-yoga',
    name: 'Gentle yoga flow',
    category: 'stretch',
    intensity: 1,
    durationMinutes: 15,
    indoor: true,
    outdoor: false,
    description: 'A slow sequence of basic yoga poses, held with steady breathing.',
    tip: 'A gentle option that combines light movement with slow, steady breathing built into the poses themselves.',
    whyItWorks:
      'The poses use a little muscle energy the same way any light movement does, and the slow, steady breathing built into yoga also calms the stress response, so it works on the glucose gap from two directions at once, gently.',
  },
  {
    id: 'walk-outdoor-long',
    name: 'Longer outdoor walk',
    category: 'walk',
    intensity: 2,
    durationMinutes: 30,
    indoor: false,
    outdoor: true,
    description: 'A 30-minute walk somewhere with a bit of scenery: a park, a trail, or just around the neighborhood.',
    tip: 'Longer duration at a moderate pace is one of the more reliable ways to offset a bigger gap, so pace yourself and recheck partway through.',
    whyItWorks:
      'Total glucose used depends on both how hard and how long you move. Stretching a moderate pace over 30 minutes instead of 15-20 adds up to more total glucose pulled in, without needing to push harder than a normal walk.',
  },
  {
    id: 'bw-core',
    name: 'Core & balance circuit',
    category: 'bodyweight',
    intensity: 2,
    durationMinutes: 15,
    indoor: true,
    outdoor: false,
    description: 'Planks, bird-dogs, and standing balance holds at a controlled pace.',
    tip: 'Lower-impact than a cardio circuit, but still sustained muscle effort.',
    whyItWorks:
      'Holding a position under tension still keeps muscles actively working and using glucose, even without the up-and-down movement of a cardio circuit: a steadier, lower-impact way to get a similar effect.',
  },
  {
    id: 'dance-active',
    name: 'High-energy dance session',
    category: 'dance',
    intensity: 3,
    durationMinutes: 20,
    indoor: true,
    outdoor: false,
    description: 'A full-energy dance workout or high-tempo playlist danced all the way through.',
    tip: 'Similar intensity to a cardio workout, so treat it the same as any vigorous activity for hypo-awareness.',
    whyItWorks:
      'At full energy this is functionally a cardio workout: large muscle groups working hard and continuously, pulling in glucose quickly, which is powerful for a big gap but also the fastest-acting option in this list.',
  },
  {
    id: 'walk-dog',
    name: 'Walk the dog (or someone else’s)',
    category: 'walk',
    intensity: 1,
    durationMinutes: 15,
    indoor: false,
    outdoor: true,
    description: 'A relaxed-paced walk outside, letting the dog set some of the pace instead of having to self-pace the whole thing.',
    tip: 'A dog’s pace tends to drift faster without you planning it, worth a glucose check partway through a longer walk.',
    whyItWorks:
      'It’s the same muscle-glucose-uptake mechanism as any walk. Having a dog along just makes it easier to actually get moving and keep going for the full stretch instead of cutting it short.',
  },
  {
    id: 'cardio-jump-rope',
    name: 'Jump rope',
    category: 'cardio',
    intensity: 3,
    durationMinutes: 10,
    indoor: true,
    outdoor: true,
    description: 'Continuous jump-rope intervals, resting briefly whenever you need to.',
    tip: 'Very efficient at using glucose quickly, so start with short sets and check in partway through rather than jumping the whole 10 minutes straight.',
    whyItWorks:
      'Jumping repeatedly engages your calves, thighs, and core with no rest between reps, so it recruits a lot of muscle very quickly: one of the fastest ways here to pull glucose down in a short window.',
  },
  {
    id: 'cardio-shadow-box',
    name: 'Shadow boxing',
    category: 'cardio',
    intensity: 2,
    durationMinutes: 15,
    indoor: true,
    outdoor: false,
    description: 'Throwing combinations at the air, moving your feet and rotating your core the whole time.',
    tip: 'Easy to dial the pace up or down mid-session, so it can start moderate and ease off if you start feeling low.',
    whyItWorks:
      'The constant arm and core rotation keeps multiple muscle groups working at once even without equipment or much space, giving a similar glucose-uptake effect to a bodyweight circuit.',
  },
  {
    id: 'bw-wall-sit',
    name: 'Wall sit & lunge hold circuit',
    category: 'bodyweight',
    intensity: 2,
    durationMinutes: 10,
    indoor: true,
    outdoor: false,
    description: 'Alternating wall sits and static lunge holds, resting briefly between rounds.',
    tip: 'Held positions build up noticeably more effort than they first look like, so don’t judge the intensity just from how it looks.',
    whyItWorks:
      'Holding a position under load keeps the same muscles contracted continuously instead of just during a movement, which uses glucose steadily for as long as you hold it.',
  },
  {
    id: 'stairs-steady',
    name: 'Steady stair climbing',
    category: 'stairs',
    intensity: 2,
    durationMinutes: 10,
    indoor: true,
    outdoor: false,
    description: 'A steady, unhurried pace up and down stairs for the full 10 minutes, rather than one quick trip.',
    tip: 'A middle ground between a quick flight and full stair repeats: a reasonable match for a moderate gap.',
    whyItWorks:
      'Sustaining stair climbing for a full 10 minutes, even at a steady pace, keeps your leg muscles under continuous load longer than a quick trip up and down does, using more total glucose.',
  },
  {
    id: 'chores-declutter',
    name: 'Brisk tidying or organizing',
    category: 'chores',
    intensity: 1,
    durationMinutes: 15,
    indoor: true,
    outdoor: false,
    description: 'Picking up, organizing, or reorganizing a room at a steady pace, moving the whole time.',
    tip: 'Low-key enough to fold into something you were doing anyway, but only helps if you keep moving rather than pausing often.',
    whyItWorks:
      'Continuous light movement adds up the same way a light walk does: gentle, sustained muscle use, just folded into something around the house instead of a dedicated workout.',
  },
  {
    id: 'dance-freestyle-short',
    name: 'Quick freestyle dance break',
    category: 'dance',
    intensity: 1,
    durationMinutes: 5,
    indoor: true,
    outdoor: false,
    description: 'A few minutes of moving to one or two songs, as much or as little effort as feels good.',
    tip: 'A good option when you only have a couple minutes and a small gap to cover.',
    whyItWorks:
      'Even a short burst of continuous movement uses some glucose through the same muscle-uptake pathway as any activity here: brief, but useful when a longer option doesn’t fit.',
  },
  {
    id: 'cardio-sprints',
    name: 'Short sprint intervals',
    category: 'cardio',
    intensity: 3,
    durationMinutes: 12,
    indoor: false,
    outdoor: true,
    description: 'Alternating short sprints with walking recovery, outdoors where you have room to run.',
    tip: 'One of the most intense options here, similar to fast bodyweight intervals. It can spike glucose briefly before it drops, so check in during and after, not just before.',
    whyItWorks:
      'Sprinting recruits muscle very intensely for a short burst, and repeating that with brief recovery keeps demanding a lot of glucose. Effective for a large gap, but it also triggers the same brief stress-hormone spike very intense effort causes.',
  },
];
