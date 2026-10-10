# Universal CTRL Game UI | design and integration handoff

All UI changes apply to desktop, tablet and mobile: one visual vocabulary, responsive position and density. Mobile-first is the acceptance criterion, not a separate mobile UI.

References: https://www.gameuidatabase.com/ ; https://kenney.nl/assets/mobile-controls ; https://kenney.nl/assets/ui-pack ; https://simscommunity.info/2017/10/14/the-sims-mobile-complete-build-mode-overview-new-ui/ .

Expected universal UX: world canvas full viewport; compact in-game HUD instead of wide website nav; thumbnail-first object shop and gizmo editing, no mandatory typing. Homepage uses same advanced object shop as /worlds/editor. Desktop left asset shelf + right inspector; tablet/phone bottom object tray and inspector tabs. World remains visible while choosing assets. Creator remains full VRoid model presentation, mobile tall hero model and scrolled controls. Remove promotional filler, redundant celebration HUD button, and needless object editor paragraphs. Keep wallet/Keys/Settings accessible, signed-in checks, keyboard, tool and save flows.

Ownership: separate UI branch based on PR16, NO overwrite or merge of Astra backend or PR14 ETH/CTRL holder tiers. Production deploy forbidden until screenshot audits at iPhone 390x844, Android 360x780, tablet 820x1180, desktop 1440x900, browser navigation, object placement and wallet E2E pass. No new third-party binaries.