import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../../assets/style/myPage/serviceCenter/UserQnAList.css';
import { ArrowLeftLong, Down, Up } from "../../../components/imgcomponents/ImgComponents";
import {useNavigate} from "react-router-dom";
import PageHeader from "../../../components/layout/PageHeader";

function UserQnAList() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserQuestions, setShowUserQuestions] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [expandedQuestionIds, setExpandedQuestionIds] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userIdx, setUserIdx] = useState(null);

    const token = localStorage.getItem('token');
    const storedUserIdx = localStorage.getItem('userIdx');

    useEffect(() => {
        setIsLoggedIn(!!token);
        if (storedUserIdx) {
            setUserIdx(parseInt(storedUserIdx, 10));
        }
        fetchQuestions();
    }, [showUserQuestions, token, storedUserIdx]);

    const fetchQuestions = async () => {
        try {
            const url = showUserQuestions
                ? `http://localhost:8080/api/users/${userIdx}/questions`
                : 'http://localhost:8080/api/questions';

            const response = await axios.get(url, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            console.log('API Response:', response.data); // Log API response for debugging

            setQuestions(response.data);
        } catch (error) {
            console.error('질문 목록 불러오기 오류:', error);
            alert('질문 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (question) => {
        setEditingQuestion(question);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditingQuestion({
            ...editingQuestion,
            [name]: value
        });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const userIdx = localStorage.getItem('userIdx');

        if (!token) {
            alert('로그인 후 다시 시도해 주세요.');
            return;
        }

        try {
            await axios.put(
                `http://localhost:8080/api/questions/${editingQuestion.queIdx}`,
                {
                    queTitle: editingQuestion.queTitle,
                    queDescription: editingQuestion.queDescription,
                    userIdx: parseInt(userIdx, 10)  // userIdx 추가
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // 최신 데이터 가져오기
            fetchQuestions(); // 수정 후 최신 데이터로 업데이트
            setEditingQuestion(null);
            alert('질문이 수정되었습니다!');
        } catch (error) {
            console.error('질문 수정 오류:', error.response?.data || error.message);
            alert('질문 수정에 실패했습니다.');
        }
    };

    const handleDeleteClick = async (queIdx) => {
        if (!window.confirm('정말로 이 질문을 삭제하시겠습니까?')) return;

        try {
            await axios.delete(`http://localhost:8080/api/questions/${queIdx}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            setQuestions(prevQuestions => prevQuestions.filter(q => q.queIdx !== queIdx));
            alert('질문이 삭제되었습니다.');
        } catch (error) {
            console.error('질문 삭제 오류:', error);
            alert('질문 삭제에 실패했습니다.');
        }
    };

    const toggleExpand = (queIdx) => {
        setExpandedQuestionIds(prev =>
            prev.includes(queIdx) ? prev.filter(id => id !== queIdx) : [...prev, queIdx]
        );
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR');
    };


    const moveUserQnA = () => {
        navigate('/mypage/serviceCenter/userQnA');
    };

    return (
        <div className="user-qna-list-main">
            <PageHeader title={showUserQuestions ? "나의 문의내역" : "전체 문의내역"} />
            <div className="user-qna-list">
                <div>
                    <button
                        className={showUserQuestions ? "qna-list-item select-qna" : "qna-list-item"}
                        onClick={() => isLoggedIn && setShowUserQuestions(true)}
                        disabled={!isLoggedIn}
                    >
                        나의 문의내역
                    </button>
                    <button
                        className={showUserQuestions ? "qna-list-item" : "qna-list-item select-qna"}
                        onClick={() => setShowUserQuestions(false)}
                    >
                        전체 문의내역
                    </button>
                </div>
                {isLoggedIn && (
                    <button className="adit-qna" onClick={moveUserQnA}>
                        문의 작성
                    </button>
                )}
            </div>
            {questions.length === 0 ? (
                <div className="no-inquiries">
                    <img src="/bobple_mascot.png" alt="" width={200} />
                    <p>아직 문의한 내용이 없습니다</p>
                </div>
            ) : (
                <ul>
                    {questions.map((question) => (
                        <li key={question.queIdx}>
                            {editingQuestion && editingQuestion.queIdx === question.queIdx ? (
                                <form onSubmit={handleEditSubmit} className="qna-modify-form">
                                    <div className="qna-modify-top">
                                        <input
                                            type="text"
                                            name="queTitle"
                                            value={editingQuestion.queTitle}
                                            onChange={handleEditChange}
                                            required
                                        />
                                        <p className="qna-modify-date">{formatDate(question.createdAt)}</p>
                                    </div>
                                    <textarea
                                        name="queDescription"
                                        value={editingQuestion.queDescription}
                                        onChange={handleEditChange}
                                        required
                                    ></textarea>
                                    <div className="qna-modify-buttons">
                                        <button className="qna-modify-cancle" type="button" onClick={() => setEditingQuestion(null)}>취소</button>
                                        <button className="qna-modify-submit" type="submit">저장</button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <button className="qna-title" onClick={() => toggleExpand(question.queIdx)}>
                                        <div className="qna-title-left">
                                            <div className="qna-title-top">
                                                <h6>{question.queTitle}</h6>
                                                {question.status ?
                                                    <p className="qna-waiting qna-finish">처리됨</p>
                                                    :
                                                    <p className="qna-waiting">대기중</p>
                                                }
                                            </div>
                                            <p className="qna-date">{formatDate(question.createdAt)}</p>
                                        </div>
                                        {expandedQuestionIds.includes(question.queIdx) ? <Up /> : <Down />}
                                    </button>
                                    {expandedQuestionIds.includes(question.queIdx) && (
                                        <div className="qna-content">
                                            <p>{question.queDescription}</p>
                                            <p><strong>답변:</strong> {question.answers.length > 0 ? question.answers[0].answer : '답변 예정'}</p>
                                            <div className="qna-modify-buttons">
                                                {question.userIdx === userIdx && (
                                                    <>
                                                        {/* 삭제 버튼은 항상 표시됨 */}
                                                        <button className="qna-delete" onClick={() => handleDeleteClick(question.queIdx)}>삭제</button>
                                                        {/* 수정 버튼은 status가 false일 때만 표시됨 */}
                                                        {!question.status && (
                                                            <button className="qna-modify" onClick={() => handleEditClick(question)}>수정</button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default UserQnAList;
