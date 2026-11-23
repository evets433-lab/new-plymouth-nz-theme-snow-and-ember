# New Plymouth New Zealand Theme: Snow & Ember

An animated night-time theme for the Claude desktop and mobile apps, set on the Taranaki coast in Aotearoa New Zealand. The scene tracks how much of your session and plan you've used.

| What you see | What it tracks |
| --- | --- |
| **Snow on Mt Taranaki** (left). The snow line creeps down the mountain as the context window fills. Past half full the snow builds up thicker and thicker, and at 100% the mountain is absurdly buried. | Context window used in this chat |
| **A campfire on the beach** (bottom right). The flames, glow and embers shrink as you use up your 5-hour limit, until only coals and smoke are left. | 5-hour plan usage left |
| **A solar eclipse** (top right). A moon slides across the sun as the week goes on, with a glowing corona near totality. | Weekly plan usage |

Each part carries a small label with its current figure, and the status line shows all three: `❄ context 42% · 🔥 5h 70% left · 🌘 week 55% left`.

Also in the scene: the bush ring of the national park, Ngāmotu / New Plymouth's lights along the coast, Paritutu and the Sugar Loaf Islands, the sea, tī kōuka (cabbage trees) and the Southern Cross.

The animated backdrop shows in the Claude desktop and mobile apps. The terminal shows the status line only.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install snow-and-ember --marketplace evets433-lab/new-plymouth-nz-theme-snow-and-ember
```

Answer `y` to add the marketplace, then press Enter to install for your user (all your sessions).

Or from a shell:

```
claude plugin install snow-and-ember --marketplace evets433-lab/new-plymouth-nz-theme-snow-and-ember
```

In the Claude desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `evets433-lab/new-plymouth-nz-theme-snow-and-ember`, then **Add plugin**.

## Notes

- The fire and eclipse need plan usage figures, which Claude subscriptions report. Without them the fire stays fully lit and the sun stays uncovered.
- Each chat has its own context window, so the snow starts low in a new chat. Usage figures are per account, so the fire and eclipse look the same in every chat.
- To remove it, uninstall the plugin with `/plugin`.
