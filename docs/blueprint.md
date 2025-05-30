# **App Name**: Draw Duel AI

## Core Features:

- New Game Initiation: Teacher creates a new game, triggering AI to generate a drawing topic.
- Game Interface Display: Display the drawing topic and a 3-minute countdown timer on the teacher's page. Simultaneously display student pages (left and right).
- Student Assignment: Students join the game and are automatically assigned to either the left or right student page.
- Real-time Drawing: Students are able to draw on a canvas, using the tools provided, when the teacher starts the game. Drawing progress is communicated through the MQTT channel 'drawpkla/all' from: broker.emqx.io WebSocket port 8083, WebSocket Secure port 8084. CDN網執址：https://cdnjs.cloudflare.com/ajax/libs/mqtt/4.3.7/mqtt.min.js.
- AI Drawing Evaluation: After time is up, the AI tool evaluates both drawings based on adherence to the topic and artistic merit.
- Score and Feedback Generation: The AI tool provides scores (0-100) for each drawing, along with brief (50 characters) textual feedback, communicated through the MQTT channel 'drawpkla/all'.
- Results Display: Display the scores, feedback, and the determined winner on the teacher's page.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey intelligence, focus, and trust, relevant to an application using generative AI.
- Background color: Light blue-gray (#E8EAF6), which is close to the primary color but very desaturated, provides a calm, unobtrusive backdrop.
- Accent color: Purple (#7E57C2), which is analogous to blue but slightly shifted in hue, to highlight interactive elements without being distracting.
- Clean and readable sans-serif font for clear display of drawing topics, scores, and feedback.
- Responsive design ensuring optimal display on various screen sizes, maintaining a 100% width and height ratio.
- Simple, intuitive icons to represent drawing tools and game controls.
- Subtle transition effects for timer updates and score displays to enhance user engagement.