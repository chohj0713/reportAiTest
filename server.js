global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const express = require('express');
const cors = require('cors'); // 브라우저 요청 허용

const app = express();
const PORT = 3000;

// OpenAI API 키 설정 (환경 변수 사용 권장)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Middleware 설정
app.use(express.json());
app.use(cors());

app.post('/api/completion', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        // OpenAI API 호출
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 150, // 응답 최대 토큰 길이 설정
                temperature: 0.7, // 텍스트 창의성 설정
                frequency_penalty: 0.2, // 동일 단어 반복 감소
                presence_penalty: 0.6, // 새로운 주제 도입 유도
                stop: null // 종료 기준 설정
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

        // API 응답 성공 시 데이터 처리
        const data = await response.json();
        const completion = data.choices[0]?.message?.content?.trim();
        res.status(200).json({ result: completion });
    } catch (error) {
        console.error('Server Error:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});