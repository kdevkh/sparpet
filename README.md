## 😺스파르펫🐶(sparpet)

### ✨ 프로젝트 소개
내 반려동물 자랑, 반려동물 용품 후기, 반려동물 지식 등등 모든 것을 게시할 수 있는 사이트.

### 🕰️ 개발 기간
- 2024.02.07 수 ~ 2024.02.14 수

### 😎 멤버 구성 & 담당
- 14조 포텐터지는포틴조
  - 김경훈 : 사용자 CRUD(회원가입, 로그인, 로그아웃), 게시물 CRUD(게시물 생성, 조회, 수정, 삭제), 댓글 CRUD, 노드메일러
  - 이재헌 : 카카오/네이버/구글 회원가입, 로그인, 로그아웃
  - 이수지 : 게시물 좋아요/좋아요 취소, 사용자가 좋아요한 게시물 조회, 댓글 좋아요/좋아요 취소, 조회수 기능, 프론트엔드
  - 전수민 : 팔로우/언팔로우, 팔로워 조회, 팔로잉 조회, 팔로잉 게시물 조회, 프로필 사진 업로드/조회/수정, 멀티미디어 파일 업로드/조회/수정, 프론트엔드

### ⚙️ 개발 환경
- Node.js, Express, AWS RDS, S3, Github, Oauth, zep

### 📌 주요 기능

- 회원가입 : 일반 이메일 회원가입, 소셜 회원가입(카카오, 네이버, 구글)
- 로그인 :  일반 이메일 로그인, 소셜 로그인(카카오, 네이버, 구글), 노드메일러
- 게시물 : 전체 게시물 목록 조회, 사용자가 작성한 게시물 목록 조회, 상세 게시물 조회, 게시물 작성, 수정, 삭제
- 댓글 : 댓글 조회, 작성, 수정, 삭제
- 좋아요 : 게시물 좋아요/좋아요 취소, 좋아요한 게시물 목록 조회, 댓글 좋아요/좋아요 취소
- 팔로우 : 팔로우/언팔로우, 팔로워 조회, 팔로잉 조회

### 🔒 환경변수
 - DATABASE_URL
 - CLIENT_ID
 - CLIENT_SECRET
 - CALLBACK_URL
 - CLIENT_ID_KAKAO
 - CLIENT_SECRET_KAKAO
 - CALLBACK_URL_KAKAO
 - CLIENT_ID_GOOGLE
 - CLIENT_SECRET_GOOGLE
 - CALLBACK_URL_GOOGLE
 - EMAILSERVICE
 - USERMAIL
 - PASSWORD
 - AWS_ACCESS_KEY
 - AWS_SECRET_ACCESS_KEY
 - BUCKET_NAME
 - BUCKET_REGION

 ### ✒ API 명세서 URL
 - https://teamsparta.notion.site/b08cfc29a21941b7a8e2398277e89e68?v=4b5da409068347a8a81c141e15c3499b

 ### 🔧 ERD URL
<img width="1036" alt="스크린샷 2024-02-15 오전 10 35 23" src="https://github.com/kdevkh/sparpet/assets/154482647/f8e3867c-f5fc-47ad-b4f2-9e08d9bd0efc">

