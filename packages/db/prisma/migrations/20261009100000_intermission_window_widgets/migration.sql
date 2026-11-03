-- Convert the two previously fixed frames once. Existing widgets, scene IDs and URLs stay intact.
INSERT INTO "OverlayWidget" ("id", "overlayId", "type", "x", "y", "width", "height", "zIndex", "params", "createdAt", "updatedAt")
SELECT md5(overlay."id" || ':intermission:' || frame.title), overlay."id", 'WINDOW'::"WidgetType",
       frame.x, frame.y, frame.width, 32.4 + 1 + (frame.width - 2) * 9.0 / 16.0, 1,
       jsonb_build_object(
           'title', frame.title,
           'lockContentAspectRatio', true,
           'color', CASE overlay."settings"->>'theme'
               WHEN 'autumn' THEN '#f6aa1c' WHEN 'winter' THEN '#d3d2c6' WHEN 'light' THEN '#171821' ELSE '#ffffff' END,
           'backgroundColor', CASE overlay."settings"->>'theme'
               WHEN 'autumn' THEN '#62170854' WHEN 'winter' THEN '#6d6d695e' WHEN 'light' THEN '#f2f2f7' ELSE '#1b191ca1' END
       ), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Overlay" AS overlay
CROSS JOIN (VALUES ('Webcam', 38, 22, 498), ('Game', 630, 76, 1252)) AS frame(title, x, y, width)
WHERE overlay."settings"->>'scene' = 'intermission'
ON CONFLICT ("id") DO NOTHING;
