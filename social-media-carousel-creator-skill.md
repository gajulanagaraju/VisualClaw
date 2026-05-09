# Social Media Carousel Creator Skill

## Skill Name
social-media-carousel-creator

## Purpose
Create social media carousel posts from Google Drive, Google Photos, and visited location notes. The assistant reviews photos, selects strong visuals, improves them, writes captions, and exports ready-to-post carousel files.

## Best Use Cases
- Conference highlights
- Travel posts
- Restaurant and resort visits
- Award ceremony recap
- Team events
- Site visits
- Before and after photo stories
- Daily trip recap posts

## User Goal
Turn raw photos and location context into polished social media carousel posts that are ready to download and publish on LinkedIn, Instagram, Facebook, or WhatsApp.

---

## Required Inputs

### Minimum Inputs
- Event name
- Date or date range
- Platform target
- Photo source
- Desired tone

### Supported Photo Sources
- Google Drive folder
- Google Photos album
- Uploaded photos
- Local folder path
- Phone camera uploads
- Manual image selection

### Optional Inputs
- Location name
- People to mention
- Brand colors
- Company name
- Logo
- Hashtag preference
- Caption length
- Language
- Image orientation
- Number of carousel slides

---

## Default Output Formats

### Instagram Carousel
- Size: 1080 x 1350
- Slides: 5 to 10
- Format: PNG or JPG
- Caption: Warm, short, visual

### LinkedIn Carousel
- Size: 1080 x 1350 or PDF carousel
- Slides: 5 to 8
- Caption: Professional, achievement-focused

### Facebook Post
- Size: 1080 x 1080 or 1080 x 1350
- Caption: Personal, clear, friendly

### WhatsApp Share
- Size: 1080 x 1920 or 1080 x 1350
- Caption: Short, simple, family-friendly

---

## Workflow

### Step 1: Connect Source
Ask user for one of these:
- Google Drive folder link
- Google Photos album link
- Uploaded images
- Local folder path

If using Google Drive:
- Search the folder
- Identify image files
- Read filenames, dates, and metadata when available
- Group images by day, location, or activity

If using Google Photos:
- Open album link if access exists
- Group images by date and location when metadata exists
- Select strongest images by clarity, expression, lighting, and storytelling value

If access fails:
- Ask user to upload photos directly
- Or ask for a public/shared folder link

---

### Step 2: Build Story
Create a short visual story.

Story types:
- Arrival and first impression
- Award recognition
- Conference moments
- Team and peer networking
- Resort and travel experience
- Food and dining
- Activity recap
- Final reflection

Recommended slide flow:
1. Strong cover image
2. Context photo
3. People or moment photo
4. Activity or location highlight
5. Detail shot
6. Achievement or learning
7. Closing image
8. Call to reflection

---

### Step 3: Photo Selection Rules
Choose photos using this priority:
1. Clear face or strong subject
2. Good lighting
3. Clean background
4. Natural expression
5. Event relevance
6. No duplicate angles
7. Good crop potential
8. No awkward body posture
9. No visible private information
10. No unflattering group photo

Reject:
- Blurry images
- Screenshots with private info
- Low light photos
- Duplicate images
- Photos where people look uncomfortable
- Photos with badges or personal data visible unless user approves

---

### Step 4: Photo Enhancement Rules
Enhance photos lightly:
- Improve exposure
- Correct white balance
- Crop for platform size
- Straighten horizon
- Reduce noise
- Sharpen mildly
- Remove distractions only when safe
- Keep faces natural

Do not:
- Over-smooth faces
- Change body shape
- Add fake people
- Make luxury scenes unrealistic
- Modify company logos
- Change award text

---

### Step 5: Carousel Design Rules

Visual style:
- Premium
- Clean
- Modern
- Minimal text
- Strong spacing
- High contrast
- Mobile readable

Text rules:
- Short slide titles
- Maximum 8 words per slide title
- Maximum 20 words body text per slide
- Avoid clutter

Recommended fonts:
- Clean sans serif
- Bold title
- Medium body

Recommended colors:
- Navy
- White
- Teal
- Beige
- Charcoal

Avoid:
- Busy templates
- Heavy gradients
- Too many icons
- Overused motivational phrases
- Tiny text

---

## Caption Frameworks

### LinkedIn Award Post
Use this structure:
- Recognition
- Gratitude
- Impact area
- Team appreciation
- Forward-looking reflection

Caption template:
"Grateful to be recognized at [event name].

This milestone reflects the work, support, and collaboration of many people across teams. I’m thankful for the opportunity to contribute to [impact area] and to keep learning from strong leaders and peers.

The biggest takeaway from this experience: [personal lesson].

Looking forward to applying these learnings and continuing to drive meaningful impact."

---

### Instagram Travel + Conference Post
Use this structure:
- Place
- Moment
- Feeling
- Short reflection

Caption template:
"[Location] gave me a week to remember.

A mix of learning, recognition, great conversations, and beautiful views. Grateful for the people, the experience, and the journey."

---

### Professional Carousel Slide Text
Slide 1:
Top Performance Conference 2026

Slide 2:
A career milestone

Slide 3:
Recognition with gratitude

Slide 4:
Learning from global leaders

Slide 5:
Culture, strategy, and ownership

Slide 6:
Building stronger connections

Slide 7:
Bringing the energy back to the team

---

## Platform Specific Instructions

### LinkedIn
Goal:
Professional credibility

Carousel style:
- Clean cover
- Short titles
- 5 to 8 slides
- PDF export preferred

Caption style:
- Clear
- Grateful
- Leadership focused

Avoid:
- Too many emojis
- Casual slang
- Excessive personal detail

---

### Instagram
Goal:
Visual storytelling

Carousel style:
- Strong photo-first layout
- Minimal text
- 6 to 10 slides

Caption style:
- Warm
- Personal
- Short

---

### Facebook
Goal:
Family and friend friendly

Carousel style:
- Photos first
- Less business language
- More personal tone

Caption style:
- Simple
- Proud
- Grateful

---

### WhatsApp
Goal:
Quick sharing

Output:
- 3 to 5 best images
- One short message
- Optional 30 second story script

---

## Safety and Privacy Checks

Before export:
- Blur or crop badges if needed
- Remove visible QR codes
- Remove private agenda info
- Remove private emails
- Remove phone numbers
- Avoid posting children unless user approves
- Avoid posting people in swimwear unless user approves
- Avoid posting closed-door session slides unless approved
- Avoid exposing company confidential details

Sensitive content handling:
- If a photo includes private company slides, internal strategy, or employee data, do not include it in social media output.
- Ask user before publishing photos with other people.

---

## Output Deliverables

Create a folder with:
- carousel_images/
- captions/
- source_selected/
- rejected_photos/
- export/

Files to generate:
- linkedin_carousel.pdf
- instagram_carousel_1080x1350.zip
- facebook_post_images.zip
- whatsapp_share_pack.zip
- captions.md
- image_selection_report.md

---

## OpenClaw Commands

### Create Carousel From Google Drive
User command:
"OpenClaw, create a LinkedIn carousel from this Google Drive folder: [folder link]. Use Top Performance Conference 2026 theme. Keep it professional and premium."

Expected action:
- Open folder
- Review images
- Select best 6 to 8 photos
- Create carousel
- Write LinkedIn caption
- Export PDF and PNG files

---

### Create Carousel From Google Photos
User command:
"OpenClaw, create an Instagram carousel from this Google Photos album: [album link]. Focus on Boracay, conference moments, and award recognition."

Expected action:
- Open album
- Select best story photos
- Group by day
- Create 8 to 10 slide carousel
- Write caption
- Export downloadable files

---

### Create Daily Recap
User command:
"OpenClaw, make a daily recap post from today’s photos. Keep it clean, premium, and LinkedIn friendly."

Expected action:
- Use today’s images
- Select best 5
- Create short carousel
- Write professional caption
- Export

---

### Create Award Post
User command:
"OpenClaw, make my award recognition post from these photos. Keep it humble, confident, and professional."

Expected action:
- Select award photo first
- Add 3 to 5 supporting photos
- Create LinkedIn carousel
- Write polished caption
- Export

---

### Create Travel Memory Post
User command:
"OpenClaw, create a warm personal travel post from my Boracay photos. Make it suitable for Facebook and Instagram."

Expected action:
- Select scenic and personal photos
- Keep text minimal
- Export square and portrait versions
- Write short caption

---

## File Naming Convention

Use:
YYYY-MM-DD_event_platform_version

Examples:
2026-05-13_tpc2026_linkedin_award_v1.pdf
2026-05-13_boracay_instagram_carousel_v1.zip
2026-05-14_dine-around-facebook-v1.zip

---

## Quality Checklist

Before giving final files:
- Cover slide looks strong
- Text is readable on mobile
- Crops are clean
- Images are not duplicated
- Private information is removed
- Caption matches platform
- Files are downloadable
- Export names are clear
- User receives final caption and files

---

## Suggested Conference Post Ideas

### Post 1
Title:
Arrived in Boracay for Top Performance Conference 2026

Purpose:
Arrival and gratitude

Best photos:
- Resort view
- Airport arrival
- Badge or welcome area
- Ocean view

---

### Post 2
Title:
A Career Milestone

Purpose:
Award recognition

Best photos:
- Award moment
- Professional portrait
- Conference stage
- Team photo

---

### Post 3
Title:
Strategy, Culture, and Ownership

Purpose:
Workshop reflection

Best photos:
- Conference room
- Notes
- Group discussion
- Resort business setting

---

### Post 4
Title:
Boracay Moments

Purpose:
Personal travel memory

Best photos:
- Beach
- Dining
- Activities
- Sunset

---

### Post 5
Title:
Bringing The Energy Back

Purpose:
Closing reflection

Best photos:
- Final resort photo
- Award photo
- Group photo
- Travel departure image

---

## Tone Guide

Professional:
- Clear
- Grateful
- Confident
- Team oriented

Personal:
- Warm
- Simple
- Proud
- Reflective

Avoid:
- Boasting
- Overly emotional language
- Long captions
- Company confidential content
- Too many hashtags

---

## Final Reminder

This skill should help the owner create polished social media assets quickly while protecting privacy and preserving a premium executive image.
