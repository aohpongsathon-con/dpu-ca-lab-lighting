# DPU CA Lab Lighting

เว็บเรียนรู้การจัดแสง Nitade Creator Lab เปิด `index.html` ได้โดยตรง โดยเก็บ `assets` ไว้ข้างไฟล์ HTML เสมอ โมเดล ฟอนต์ และ JavaScript รวมใน repository แล้ว

## เครื่องใหม่

ติดตั้ง Git แล้วรัน:

```sh
git clone https://github.com/aohpongsathon-con/dpu-ca-lab-lighting.git
cd dpu-ca-lab-lighting
```

เปิดโฟลเดอร์ใน Codex และอ่าน `AGENTS.md` ตำแหน่งโฟลเดอร์/ไดรฟ์ต่างกันได้ การ Push ต้องเข้าสู่ระบบ GitHub ด้วยบัญชีที่มีสิทธิ์เขียน

## สลับเครื่อง

ก่อนเริ่มงาน:

```sh
git status
git pull --ff-only
```

แก้ `lighting-production.html` เป็นไฟล์หลัก จากนั้นใช้ Node.js 20 ขึ้นไป (ไม่ต้อง npm install):

```sh
npm run sync
npm test
git diff --stat
git add .
git commit -m "Describe the change"
git push
git status
```

ตรวจรายการไฟล์ก่อน Commit เสมอ `index.html` เป็นสำเนาสำหรับ GitHub Pages ที่สร้างด้วย `npm run sync` ห้ามแก้สองไฟล์แยกกัน กลับเครื่องเดิมให้ Pull ก่อนทำต่อ หากมีงานค้างหรือประวัติแยกกัน ให้เก็บงานและแก้ conflict ก่อน ห้าม force push หรือ reset hard เพื่อข้ามปัญหา

ประวัติแชท Codex, การเข้าสู่ระบบ GitHub และ localStorage ของเบราว์เซอร์ไม่ได้ย้ายด้วย Git ใช้ `AGENTS.md` เป็นบริบทส่งต่องาน ลิงก์ภายนอกยังต้องใช้อินเทอร์เน็ต ดูที่มาโมเดลใน `assets/models/THIRD_PARTY_MODELS.md`
