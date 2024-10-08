# 1단계: Node.js 이미지를 기반으로 빌드
FROM node:14 AS builder
WORKDIR /frontend

# package.json과 package-lock.json을 복사하여 캐싱 효과를 극대화
COPY package.json package-lock.json ./
RUN npm install

# 소스 코드를 복사한 후 빌드 수행
COPY . .
RUN npm run build

# 2단계: Nginx 이미지를 기반으로 프로덕션 환경 설정
FROM nginx:latest
RUN rm /etc/nginx/conf.d/default.conf
COPY ./nginx.conf /etc/nginx/conf.d/

# 빌드된 파일을 Nginx의 정적 파일 위치로 복사
COPY --from=builder /frontend/build /usr/share/nginx/html
EXPOSE 80
CMD [ "nginx", "-g", "daemon off;" ]



## 1단계: 빌드 단계
## Node.js 이미지로 시작하여 애플리케이션을 빌드합니다.
#FROM node:18 AS build
#
## 작업 디렉토리 생성
#WORKDIR /app
#
## 패키지 파일 복사 및 설치
#COPY package.json package-lock.json ./
#RUN npm install
#
## 모든 소스 파일 복사
#COPY . .
#
## 리액트 애플리케이션을 빌드합니다.
#RUN npm run build
#
## 2단계: 실행 단계
## Nginx를 사용하여 정적 파일을 제공
#FROM nginx:alpine
#
## Nginx 설정 파일을 대체하거나 수정할 수 있습니다.
## 기본적으로 Nginx는 /usr/share/nginx/html 디렉토리에서 파일을 제공
#COPY --from=build /app/build /usr/share/nginx/html
#
## Nginx 설정 파일을 복사하려면 아래 라인을 사용합니다.
## COPY nginx.conf /etc/nginx/nginx.conf
#
## Nginx는 기본적으로 80 포트에서 동작합니다.
#EXPOSE 80
#
## Nginx 실행
#CMD ["nginx", "-g", "daemon off;"]
