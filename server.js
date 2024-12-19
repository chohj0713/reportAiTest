import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_PAGES_URL = 'https://chohj0713.github.io/reportAiTest/uploads';

// 파일 업로드 설정
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(__dirname, 'uploads');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB 제한
});

app.use(cors());
app.use(express.json());

// 이미지 및 텍스트 처리 API
app.post('/api/completion', upload.single('photo'), async (req, res) => {
    try {
        const content = req.body.content?.trim() || '애견유치원 알림장을 작성해줘.';
        const fileName = req.file?.originalname || null; // 업로드된 파일 이름
        let imageURL = null;

        if (fileName) {
            // GitHub Pages URL로 설정
            imageURL = `${GITHUB_PAGES_URL}/${fileName}`;
        }

        const messages = [
            { role: 'user', content: [{ type: 'text', text: content }] }
        ];

        if (imageURL) {
            messages[0].content.push({
                type: 'image_url',
                image_url: { url: imageURL }
            });
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API Error:', errorText);
            return res.status(response.status).json({
                error: `OpenAI API Error: ${response.statusText}`,
                details: errorText
            });
        }

        const data = await response.json();
        const completion = data.choices[0]?.message?.content?.trim();

        res.status(200).json({ result: completion });
    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// 업로드된 파일 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 서버 실행
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
