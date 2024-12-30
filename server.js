import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ngrok from 'ngrok';
import OpenAI from 'openai'

// 환경 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;
const MODEL_NAME = 'gpt-4o-mini';

let NGROK_URL = ''; // 동적 ngrok URL 저장 변수

// OpenAI 초기화
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 파일 업로드를 위한 multer 설정
const uploadPath = path.join(__dirname, 'uploads');
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath); // 업로드 경로 설정
        },
        filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}-${file.originalname}`;
            cb(null, uniqueName); // 고유 파일 이름 생성
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 최대 파일 크기: 5MB
});

// 미들웨어 설정
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(uploadPath)); // 업로드된 파일 정적 제공
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공

// 루트 경로 처리
app.get('/', (_, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// /uploads 요청 처리 (디렉토리 내용 반환)
app.get('/uploads', (req, res) => {
    fs.readdir(uploadPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: '디렉토리를 읽을 수 없습니다.' });
        }
        const fileUrls = files.map(file => `${NGROK_URL}/uploads/${file}`);
        res.json({ files: fileUrls });
    });
});

// 파일 업로드 API
app.post('/uploads', upload.single('photo'), (req, res) => {
    if (!req.file) {
        console.error('파일 업로드 실패');
        return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const fileUrl = `${NGROK_URL}/uploads/${req.file.filename}`;
    console.log('Uploaded file URL:', fileUrl);

    res.status(200).json({ fileUrl });
});

// ngrok URL 반환 API
app.get('/server-url', (_, res) => {
    if (!NGROK_URL) {
        return res.status(500).json({ error: 'ngrok URL이 설정되지 않았습니다.' });
    }
    res.status(200).json({ url: NGROK_URL });
});

// OpenAI API 요청 처리
app.post('/api/completion', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.error('유효하지 않은 메시지 요청:', messages);
            return res.status(400).json({ error: '메시지가 제공되지 않았습니다.' });
        }

        console.log('OpenAI 요청 데이터:', JSON.stringify(messages, null, 2));

        const response = await openai.chat.completions.create({
            model: MODEL_NAME, // 모델 사용
            messages,
        });

        if (!response || !response.choices || response.choices.length === 0) {
            console.error('OpenAI 응답 데이터가 올바르지 않습니다:', response);
            return res.status(500).json({ error: 'OpenAI 응답 데이터가 올바르지 않습니다.' });
        }

        const result = response.choices[0].message?.content;

        if (!result) {
            console.error('OpenAI 응답에서 결과가 비어 있습니다:', response.data);
            return res.status(500).json({ error: 'OpenAI 응답이 비어 있습니다.' });
        }

        res.status(200).json({ result });
    } catch (error) {
        console.error('OpenAI 요청 실패:', error.message);
        res.status(500).json({ error: '서버 오류', details: error.message });
    }
});

// 서버 및 ngrok 시작
const startServer = async () => {
    try {
        app.listen(PORT, () => {
            console.log(`Local server is running on http://localhost:${PORT}`);
        });

        NGROK_URL = await ngrok.connect(PORT); // ngrok 실행
        console.log(`ngrok tunnel opened at: ${NGROK_URL}`);
        console.log(`Uploads are available at ${NGROK_URL}/uploads`);
    } catch (error) {
        console.error('ngrok 실행 중 오류:', error.message);
        NGROK_URL = `http://localhost:${PORT}`;
    }
};

startServer();