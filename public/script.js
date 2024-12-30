const photoInput = document.getElementById("photoInput");
const contentField = document.getElementById("content");
const previewContainer = document.getElementById("previewContainer");
const autoCompleteButton = document.getElementById("autoCompleteButton");

let serverUrl = "";
let uploadedFileUrl = ""; // 업로드된 파일 URL 저장 변수

// 서버 URL 로드
async function loadServerUrl() {
    try {
        const response = await fetch("http://127.0.0.1:3000/server-url");
        if (!response.ok) throw new Error("Failed to fetch server URL");
        const data = await response.json();
        serverUrl = data.url;
        console.log(`Server URL loaded: ${serverUrl}`);
    } catch (error) {
        console.error("서버 URL 로드 실패:", error);
        alert("서버 URL을 가져오는 중 문제가 발생했습니다.");
    }
}

// 서버 URL 로드
window.addEventListener("DOMContentLoaded", loadServerUrl);

// 이미지 업로드 함수
async function uploadImage(photoFile) {
    const formData = new FormData();
    formData.append("photo", photoFile);

    const uploadResponse = await fetch(`${serverUrl}/uploads`, {
        method: "POST",
        body: formData,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("Image Upload Error:", errorText);
        throw new Error("이미지 업로드에 실패했습니다.");
    }

    const uploadData = await uploadResponse.json();
    console.log("Uploaded Image URL:", uploadData.fileUrl);

    // 업로드된 URL 저장 및 미리보기 표시
    uploadedFileUrl = uploadData.fileUrl;
    displayPreview(uploadedFileUrl);
    return uploadedFileUrl;
}

// 미리보기와 URL 표시
function displayPreview(imageUrl) {
    // 초기화
    previewContainer.innerHTML = "";
    
    // 미리보기 이미지 추가
    const previewImage = document.createElement("img");
    previewImage.src = imageUrl;
    previewImage.style.maxWidth = "300px";
    previewImage.style.marginTop = "10px";

    // 업로드된 URL 표시
    const previewUrlText = document.createElement("p");
    previewUrlText.textContent = `Uploaded URL: ${imageUrl}`;

    // 기존 내용 제거 후 업데이트
    previewContainer.appendChild(previewImage);
    previewContainer.appendChild(previewUrlText);
}

// 사진 첨부 이벤트 핸들러
photoInput.addEventListener("change", async () => {
    const photoFile = photoInput.files[0];
    if (!photoFile) {
        alert("사진을 선택해주세요.");
        return;
    }

    try {
        // 사진 업로드 및 미리보기 표시
        await uploadImage(photoFile);
    } catch (error) {
        console.error("Image Upload Failed:", error);
        alert("이미지 업로드 중 오류가 발생했습니다.");
    }
});

// "자동 완성" 버튼 클릭 이벤트
autoCompleteButton.addEventListener("click", async () => {
    if (!serverUrl) {
        alert("서버 URL을 로드하지 못했습니다. 다시 시도해주세요.");
        return;
    }

    const photoFile = photoInput.files[0];
    const userInput = contentField.value.trim();
    let messages = [];

    if (!userInput && !photoFile) {
        // 입력된 텍스트와 사진이 없는 경우
        messages.push({
            role: "user",
            content: [{ type: "text", text: "애견유치원 알림장을 작성해줘." }],
        });
    } else if (userInput && !photoFile) {
        // 입력된 텍스트만 있는 경우
        messages.push({
            role: "user",
            content: [{ type: "text", text: `애견유치원 알림장을 작성해줘. 뒤에 내용을 참고해서: ${userInput}` }],
        });
    } else if (photoFile) {
        try {
            // 사진 업로드 및 URL 가져오기
            const imageUrl = await uploadImage(photoFile);
            if (!userInput) {
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: "애견유치원 알림장을 작성해줘. 첨부한 url 링크는 오늘 애견유치원에서 있었던 일이야:" },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ],
                });
            } else {
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: `애견유치원 알림장을 작성해줘. 첨부한 url 링크는 오늘 애견유치원에서 있었던 일이고, 뒤에 내용을 참고해서: ${userInput}` },
                        { type: "image_url", image_url: { url: imageUrl } },
                    ],
                });
            }
        } catch (error) {
            console.error("Image Upload Failed:", error);
            alert("이미지 업로드 중 오류가 발생했습니다.");
            return;
        }
    }

    try {
        const completionResponse = await fetch(`${serverUrl}/api/completion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
        });

        if (!completionResponse.ok) {
            const errorText = await completionResponse.text();
            console.error("Completion Error:", errorText);
            alert("내용을 생성하는 중 문제가 발생했습니다.");
            return;
        }

        const data = await completionResponse.json();
        contentField.value += `\n${data.result}`;
    } catch (error) {
        console.error("자동 완성 오류:", error);
        alert("서버와 통신하는 중 문제가 발생했습니다.");
    }
});