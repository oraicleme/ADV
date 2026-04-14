# Product selection panel — metrics (for agents & support)

This describes the **bottom “Products”** tab in the retail promo editor, not the left **Add Products** rail.

| Label | Meaning |
|--------|--------|
| **In catalog** | Total rows in the loaded catalog. |
| **On this ad** | Products currently on the canvas (main selection from Add Products / `catalog_filter`). |
| **Available** | Products not on this ad (when “show only products not on this ad” is on). |
| **Shown** | Rows in the **scrollable list** after search + unused filter — can be much smaller than “available” if the user searched. |
| **Checked** | Checkbox rows in this panel for **batch** actions (Select all, By category). Often **0** until the user checks items; **not** the same as “on the ad”. |

The assistant should not say “the panel loaded all products” when **shown** is narrowed by search; clarify **shown** vs **available**.
