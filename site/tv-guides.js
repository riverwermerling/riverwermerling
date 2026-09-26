/*
 * Where each brand hides its volume-levelling setting.
 * Checked against manufacturer help pages and reputable guides (sources in
 * docs/tv-options.md and site/README.md). Menus vary by model and year, so
 * each guide includes the words to look for if a step doesn't match.
 */
window.TV_GUIDES = [
  {
    id: 'samsung',
    name: 'Samsung',
    setting: 'Auto Volume',
    steps: [
      'Press the <b>Home</b> button, then open <b>Settings</b> (on newer TVs, <b>All Settings</b>).',
      'Go to <b>Sound</b>, then <b>Expert Settings</b>.',
      'Select <b>Auto Volume</b> and turn it on. If you&rsquo;re offered <b>Normal</b> or <b>Night</b>, Night evens things out the most.',
    ],
  },
  {
    id: 'lg',
    name: 'LG',
    setting: 'Auto Volume',
    steps: [
      'Press the <b>Settings</b> (gear) button, then choose <b>All Settings</b>.',
      'Go to <b>Sound</b>, then <b>Advanced Settings</b> (called <b>Advanced Custom Settings</b> on some models).',
      'Turn on <b>Auto Volume Control</b>. On older LG TVs it&rsquo;s under <b>Sound</b> &rsaquo; <b>Volume Mode</b> &rsaquo; <b>Auto Volume</b>.',
    ],
  },
  {
    id: 'sony',
    name: 'Sony',
    setting: 'Advanced auto volume',
    steps: [
      'Press the <b>Settings</b> (gear) or <b>Quick Settings</b> button.',
      'Go to <b>Display &amp; Sound</b>, then <b>Sound</b>. On some models it&rsquo;s <b>Picture &amp; Sound</b> &rsaquo; <b>Sound</b>.',
      'Set <b>Advanced auto volume</b> to <b>Auto</b>.',
    ],
  },
  {
    id: 'roku',
    name: 'Roku',
    note: 'Roku TVs and Roku sticks, including TCL, Hisense and other TVs that say &ldquo;Roku TV&rdquo;.',
    setting: 'Volume leveling',
    steps: [
      'While something is playing, press the <b>&#9733;</b> (star) button on the remote.',
      'Choose <b>Sound settings</b>.',
      'Find <b>Volume mode</b> and pick <b>Leveling</b>. On some models it&rsquo;s <b>Sound mode</b> &rsaquo; <b>Customize</b> &rsaquo; <b>Volume leveling</b>: choose <b>High</b>.',
    ],
  },
  {
    id: 'fire',
    name: 'Fire TV',
    note: 'Amazon Fire TV sticks and TVs with Fire TV built in.',
    setting: 'Volume Leveler',
    steps: [
      'Go to <b>Settings</b>, then <b>Display &amp; Sounds</b>.',
      'Choose <b>Audio</b>, then <b>Advanced Audio</b>.',
      'Turn on <b>Volume Leveler</b>. Turn on <b>Dialogue Enhancer</b> too, for clearer voices.',
    ],
    extra: 'On Insignia and Toshiba Fire TVs, look for <b>TruVolume</b> instead.',
  },
  {
    id: 'apple',
    name: 'Apple TV',
    setting: 'Reduce Loud Sounds',
    steps: [
      'Open <b>Settings</b>.',
      'Choose <b>Video and Audio</b>.',
      'Turn on <b>Reduce Loud Sounds</b>. It works in every app, Netflix included.',
    ],
  },
  {
    id: 'hisense',
    name: 'Hisense',
    note: 'Hisense TVs with Hisense&rsquo;s own menus. If yours says Roku TV or Google TV, choose that instead.',
    setting: 'Auto Volume Control',
    steps: [
      'Press the <b>Menu</b> or <b>Settings</b> button.',
      'Go to <b>Sound</b> (called <b>Audio</b> on some models).',
      'Turn on <b>Auto Volume Control</b>.',
    ],
  },
  {
    id: 'vizio',
    name: 'Vizio',
    setting: 'Volume Leveling',
    steps: [
      'Press the <b>Menu</b> button.',
      'Choose <b>Audio</b>.',
      'Turn on <b>Volume Leveling</b> (called <b>TruVolume</b> on some models).',
    ],
  },
  {
    id: 'other',
    name: 'Other',
    setting: null,
    steps: [
      'Open your TV&rsquo;s <b>Settings</b> and go to <b>Sound</b> or <b>Audio</b>.',
      'Look for any of these: <b>Auto Volume</b>, <b>Volume Leveling</b>, <b>Night Mode</b>, <b>Dynamic Range</b>, <b>Dialogue Enhancer</b> or <b>Clear Voice</b>.',
      'Turn it on. If there&rsquo;s a choice of strength, pick the strongest and see how it sounds.',
    ],
  },
];
