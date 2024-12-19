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
        const content = req.body.content?.trim(); // 사용자 입력 내용
        const fileName = req.file?.filename || null; // 업로드된 파일 이름

        // 이미지 URL 생성
        let imageURL = null;
        if (fileName) {
            imageURL = `${GITHUB_PAGES_URL}/${fileName}`;
        }

        // 로그: 이미지 URL 생성 여부 확인
        console.log('Generated imageURL:', imageURL || 'No image uploaded');

        // 메시지 초기화
        const messages = [
            { role: 'user', content: [{ type: 'text', text: '애견유치원 알림장을 작성해줘.' }] }
        ];

        // 텍스트 내용 추가
        if (content) {
            messages.push({ role: 'user', content: [{ type: 'text', text: `내용을 참고해서 작성해줘: ${content}` }] });
        }

        // 이미지 URL 추가
        if (imageURL) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: '사진을 분석해서 애견유치원 알림장을 작성해줘.' },
                    { type: 'image_url', image_url: { url: imageURL } }
                ]
            });
        }

        // OpenAI API 요청 메시지 로깅
        console.log('OpenAI API Request Prompt:', JSON.stringify(messages, null, 2));

        // OpenAI API 호출
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
            console.error('OpenAI API Error:', {
                status: response.status,
                statusText: response.statusText,
                errorDetails: errorText,
                attemptedImageURL: imageURL || 'No image URL provided'
            });
            return res.status(response.status).json({
                error: `OpenAI API Error: ${response.statusText}`,
                details: errorText
            });
        }

        const data = await response.json();
        const completion = data.choices[0]?.message?.content?.trim();

        res.status(200).json({ result: completion });
    } catch (error) {
        console.error('Server Error:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// 업로드된 파일 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 서버 실행
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Uploads are available at http://localhost:${PORT}/uploads`);
    console.log(`GitHub Pages URL: ${GITHUB_PAGES_URL}`);
});