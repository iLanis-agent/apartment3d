# apartment3d

Interactive 3D walkthrough of the apartment floor plan, built with Three.js.

**Live:** https://ilanis-agent.github.io/apartment3d/

- Walk mode: first-person (WASD + mouse on desktop, twin touch controls on mobile)
- Arrange mode: drag furniture around, rotate with one tap
- Paint mode: tap any wall to recolor it
- Layout and wall colors persist in localStorage

Room dimensions follow the plan's printed labels (cm); wall thickness and door/window positions approximated from the drawing.

## שמירות גלובליות
כפתורי 💾 שמור / 📂 טען שומרים ומשחזרים סידור (ריהוט + צבעי קירות) ב-Cloudflare Worker + KV
(`apartment3d-saves.ilanis-likely.workers.dev`). השמירות ציבוריות לכל מי שיש לו את הקישור, אינן ניתנות לשינוי,
ורק הדפדפן שיצר שמירה יכול למחוק אותה (טוקן אקראי נשמר מקומית, בשרת רק ה-hash). אין מפתחות בצד הלקוח.
