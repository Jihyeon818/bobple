/*global kakao*/
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../../assets/style/recommendFood/RecommendFoodCategory.css';
import {Bookmark,  FillBookmark, CaretRight, LocationDot, SearchIcon} from "../../components/imgcomponents/ImgComponents";
import {TopSearch} from "../../components/SliderComponent";
import theme from "tailwindcss/defaultTheme";
import axios from "axios";
import useRecommendThemes from "../../hooks/RecommendFoodHooks"
import {getUserIdx} from "../../utils/auth";
import NaverImageSearch from "../../components/NaverImageSearch";

function RecommendFoodCategory() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialThemeName = searchParams.get('themeName');

    const initialCategory = searchParams.get('category');
    const initialKeyword = searchParams.get('keyword');
    const initialTheme = searchParams.get('theme');

    const [category, setCategory] = useState(initialCategory || ''); // 초기값 설정
    const [keyword, setKeyword] = useState(initialKeyword || ''); // 초기값 설정
    const [restaurants, setRestaurants] = useState([]);
    const [displayedKeyword, setDisplayedKeyword] = useState(initialKeyword || ''); // 표시될 검색어 상태 추가
    const navigate = useNavigate();
    const [userBookmarks, setUserBookmarks] = useState([]);

    // 주변 음식점 정렬 (거리순)
    const sortedRestaurants = restaurants.slice().sort((a, b) => a.distance - b.distance);

    const fetchBookmarkCounts = useCallback(async (restaurantIds) => {
        try {
            const response = await axios.get('http://localhost:8080/api/bookmarks/restaurants/count', {
                params: { restaurantIds: restaurantIds.join(',') }
            });
            return response.data;
        } catch (error) {
            console.error('북마크 개수 가져오기 실패:', error);
            return {};
        }
    }, []);

    useEffect(() => {
        const fetchUserBookmarks = async () => {
            const userIdx = getUserIdx();
            if (userIdx) {
                try {
                    const response = await axios.get(`http://localhost:8080/api/bookmarks/restaurants/${userIdx}`);
                    setUserBookmarks(response.data.map(bookmark => bookmark.restaurantId));
                } catch (error) {
                    console.error('북마크 정보 가져오기 실패:', error);
                }
            }
        };

        fetchUserBookmarks();
    }, []);

    const handleBookmarkToggle = async (restaurant) => {
        const userIdx = getUserIdx();
        if (userIdx) {
            try {
                const isBookmarked = userBookmarks.includes(restaurant.id);
                if (isBookmarked) {
                    const deleteResponse = await axios.delete(`http://localhost:8080/api/bookmarks/restaurants/${restaurant.id}`, {
                        data: { userIdx }
                    });

                    if (deleteResponse.status === 204) {
                        setUserBookmarks(prevBookmarks => prevBookmarks.filter(id => id !== restaurant.id));
                        // 북마크 개수 업데이트
                        fetchBookmarkCounts(restaurants.map(r => r.id))
                            .then(bookmarkCounts => {
                                setRestaurants(prevRestaurants => prevRestaurants.map(r =>
                                    r.id === restaurant.id ? { ...r, bookmarks_count: bookmarkCounts[r.id] || 0 } : r
                                ));
                            });
                    } else {
                        console.error('북마크 삭제 실패:', deleteResponse);
                    }
                } else {
                    // 북마크 추가 요청
                    const addResponse = await axios.post('http://localhost:8080/api/bookmarks/restaurants', {
                        userIdx,
                        restaurantId: restaurant.id,
                        restaurantName: restaurant.place_name,
                        addressName: restaurant.address_name,
                        phone: restaurant.phone
                    });

                    if (addResponse.status === 200) {
                        setUserBookmarks(prevBookmarks => [...prevBookmarks, restaurant.id]);
                        // 북마크 개수 업데이트
                        fetchBookmarkCounts(restaurants.map(r => r.id))
                            .then(bookmarkCounts => {
                                setRestaurants(prevRestaurants => prevRestaurants.map(r =>
                                    r.id === restaurant.id ? { ...r, bookmarks_count: bookmarkCounts[r.id] || 0 } : r
                                ));
                            });
                    } else {
                        console.error('북마크 추가 실패:', addResponse);
                    }
                }
            } catch (error) {
                console.error('북마크 처리 실패:', error);
            }
        }
    };


    useEffect(() => {
        const ps = new kakao.maps.services.Places();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;

                    // 카테고리가 '전체'인 경우 keywordSearch로 모든 음식점 검색
                    if (category === '전체') {
                        searchAllRestaurants(latitude, longitude);
                    } else if (keyword) {
                        searchRestaurantsByKeyword(latitude, longitude, keyword);
                    } else if (initialTheme) { // theme 쿼리 파라미터 확인
                        searchRestaurantsByTheme(latitude, longitude, initialTheme);
                    } else {
                        searchRestaurantsByCategory(latitude, longitude, category);
                    }
                },
                (err) => {
                    console.error("geolocation을 사용할 수 없어요:", err.message);
                }
            );
        } else {
            console.error("geolocation을 사용할 수 없어요.");
        }

        function searchAllRestaurants(latitude, longitude) { // 모든 음식점 검색 함수 추가
            const searchOptions = {
                location: new kakao.maps.LatLng(latitude, longitude),
                radius: 2000, // 검색 반경 (미터 단위)
            };

            ps.keywordSearch('음식점', (data, status) => { // "음식점" 키워드로 검색
                if (status === kakao.maps.services.Status.OK) {
                    fetchBookmarkCounts(data.map(restaurant => restaurant.id))
                        .then(bookmarkCounts => {
                            // 사용자 북마크 정보와 북마크 개수를 이용하여 isBookmarked, bookmarks_count 필드 추가
                            const updatedData = data.map(restaurant => ({
                                ...restaurant,
                                isBookmarked: userBookmarks.includes(restaurant.id),
                                bookmarks_count: bookmarkCounts[restaurant.id] || 0
                            }));

                            setRestaurants(updatedData);
                        });
                } else {
                    console.error("음식점 검색 실패:", status);
                }

            }, searchOptions);
        }

        function searchRestaurantsByCategory(latitude, longitude, category) {
            const searchOptions = {
                location: new kakao.maps.LatLng(latitude, longitude),
                radius: 2000, // 검색 반경 (미터 단위)
            };

            // categorySearch 대신 keywordSearch 사용
            ps.keywordSearch(category, (data, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    // 카테고리 이름을 포함하는 음식점만 필터링
                    const filteredData = data.filter(restaurant => restaurant.category_name.includes(category));

                    // 검색 결과 음식점들의 북마크 개수 가져오기
                    fetchBookmarkCounts(filteredData.map(restaurant => restaurant.id))
                        .then(bookmarkCounts => {
                            // 사용자 북마크 정보와 북마크 개수를 이용하여 isBookmarked, bookmarks_count 필드 추가
                            const updatedData = filteredData.map(restaurant => ({
                                ...restaurant,
                                isBookmarked: userBookmarks.includes(restaurant.id),
                                bookmarks_count: bookmarkCounts[restaurant.id] || 0
                            }));

                            setRestaurants(updatedData); // 음식점 목록 상태 업데이트
                        });

                } else {
                    console.error("음식점 검색 실패:", status);
                }
            }, searchOptions);
        }

        function searchRestaurantsByKeyword(latitude, longitude, keyword) {
            const searchOptions = {
                location: new kakao.maps.LatLng(latitude, longitude),
                radius: 2000, // 검색 반경 (미터 단위)
            };

            ps.keywordSearch(keyword, (data, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    const filteredData = data.filter(restaurant => restaurant.category_name.includes(category));

                    // 검색 결과 음식점들의 북마크 개수 가져오기
                    fetchBookmarkCounts(filteredData.map(restaurant => restaurant.id))
                        .then(bookmarkCounts => {
                            // 사용자 북마크 정보와 북마크 개수를 이용하여 isBookmarked, bookmarks_count 필드 추가
                            const updatedData = filteredData.map(restaurant => ({
                                ...restaurant,
                                isBookmarked: userBookmarks.includes(restaurant.id),
                                bookmarks_count: bookmarkCounts[restaurant.id] || 0
                            }));

                            setRestaurants(updatedData);
                        });
                } else {
                    console.error("음식점 검색 실패:", status);
                }
            }, searchOptions);
        }

        function searchRestaurantsByTheme(latitude, longitude, themeKeyword) {
            const searchOptions = {
                location: new kakao.maps.LatLng(latitude, longitude),
                radius: 2000, // 검색 반경 (미터 단위)
            };

            const foodNames = themeKeyword.split(" ");
            let allSearchResults = [];

            const promises = foodNames.map(foodName => {
                return new Promise((resolve, reject) => {
                    ps.keywordSearch(foodName.trim(), (data, status) => {
                        if (status === kakao.maps.services.Status.OK) {
                            // 음식점 카테고리를 포함하는 데이터만 필터링하여 resolve
                            const filteredData = data.filter(restaurant => restaurant.category_name.includes("음식점"));
                            resolve(filteredData);
                        } else {
                            reject(new Error("음식점 검색 실패: " + status));
                        }
                    }, searchOptions);
                });
            });

            Promise.all(promises)
                .then(results => {
                    allSearchResults = results.flat();
                    // 중복 제거 로직 추가
                    const uniqueSearchResults = Array.from(new Set(allSearchResults.map(JSON.stringify))).map(JSON.parse);
                    // 검색 결과 음식점들의 북마크 개수 가져오기
                    fetchBookmarkCounts(uniqueSearchResults.map(restaurant => restaurant.id))
                        .then(bookmarkCounts => {
                            // 사용자 북마크 정보와 북마크 개수를 이용하여 isBookmarked, bookmarks_count 필드 추가
                            const updatedData = uniqueSearchResults.map(restaurant => ({
                                ...restaurant,
                                isBookmarked: userBookmarks.includes(restaurant.id),
                                bookmarks_count: bookmarkCounts[restaurant.id] || 0
                            }));

                            setRestaurants(updatedData);
                        });
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }, [category, userBookmarks]);


    const handleSearch = () => {
        const trimmedKeyword = keyword.trim();
        if (!trimmedKeyword) {
            alert('키워드를 입력해주세요!');
            return;
        }
        try {
            axios.post('http://localhost:8080/api/search/saveKeyword', trimmedKeyword, {
                headers: {
                    'Content-Type': 'text/plain',
                },
                withCredentials: true,
            });
            console.log('검색어가 저장되었습니다.');
            // fetchTopKeywords(setTopKeywords);  // 인기 검색어 업데이트 (필요 없는 경우 주석 처리)
        } catch (error) {
            console.error('검색어 저장 실패:', error);
            // 에러 처리 로직 추가 (필요에 따라)
        }
        // 검색 키워드를 쿼리 파라미터로 설정하고 페이지 새로고침
        setSearchParams({ keyword: trimmedKeyword });

        window.location.reload();

        // 검색 실행 후 displayedKeyword 업데이트
        setDisplayedKeyword(trimmedKeyword);
    };

    // displayedCategory 또는 displayedKeyword 또는 initialThemeName을 표시
    const displayedTitle = keyword ? displayedKeyword : (category || initialThemeName);

    const handleImageLoaded = (imageUrl) => {
        // 이미지 로드 완료 시 호출되는 콜백 함수
        if (imageUrl) {
            // 이미지가 성공적으로 로드된 경우
        } else {
            // 이미지를 찾지 못했거나 에러 발생 시
            console.warn("이미지 로드 실패 또는 이미지 없음");
            // 필요에 따라 기본 이미지 설정 또는 에러 처리
        }
    };

    const { recommendThemes } = useRecommendThemes();
    const [filteredThemes, setFilteredThemes] = useState([]);

    useEffect(() => {
        const filtered = recommendThemes.filter(theme => theme.themeName === displayedTitle);
        setFilteredThemes(filtered);
    }, [recommendThemes, displayedTitle]);

    // Best 음식점 3개 설정 (북마크 개수 기준 정렬 후 상위 3개 선택)
    const top3BookmarkedRestaurants = [...restaurants] // restaurants 배열 복사
        .sort((a, b) => b.bookmarks_count - a.bookmarks_count) // 북마크 개수 내림차순 정렬
        .slice(0, 3);

    // Best 음식점 목록 (북마크 수가 0이 아닌 음식점이 3개 미만이면 기존 로직 유지)
    const bestRestaurants = top3BookmarkedRestaurants.length < 3 ? sortedRestaurants.slice(0, 3) : top3BookmarkedRestaurants;


    return (
        <div className="recommend-category-container">
            {/* 검색창 */}
            <div className="SearchInput">
                <input
                    type="text"
                    placeholder="검색 키워드를 입력해주세요"
                    className="AllSaerchBox"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)} // 입력 값 변경 시 keyword 상태 업데이트
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { // 엔터 키 입력 시 검색 실행
                            handleSearch();
                        }
                    }}
                />
                <button className="AllSearchButton" onClick={handleSearch} aria-label={"검색"}>
                    <SearchIcon/>
                </button>
            </div>

            {filteredThemes.length > 0 && (
                filteredThemes.map(theme => (
                    <div key={theme.themeIdx} className="category-banner"> {/* Add key here */}
                        <img src={theme.themeBannerUrl} alt={theme.themeDescription}/>
                    </div>
                ))
            )}

            <div>
                <h3 className="category-title">
                    {displayedTitle && `${displayedTitle} `}
                    <span>BEST</span>
                </h3>

                <ul className="restaurant-list top-list">
                    {bestRestaurants.map((restaurant) => (
                        <li key={restaurant.id} className="top-item">
                            <div className="restaurant-image-wrapper">
                                {/* NaverImageSearch 컴포넌트 사용 */}
                                <NaverImageSearch
                                    restaurantName={restaurant.place_name}
                                    onImageLoaded={handleImageLoaded}
                                />
                            </div>

                            <div className="top-restaurant-info">
                                <div
                                    className="top-restaurant-info-title"
                                    onClick={() => navigate(`/recommend/restaurant/${restaurant.id}`, {state: {restaurant}})}>
                                    <h6 className="restaurant-name">{restaurant.place_name}</h6>
                                </div>
                                <div className="top-restaurant-location">
                                    <span
                                        className="restaurant-distance"><LocationDot/>{Math.round(restaurant.distance)}m</span>
                                    <button
                                        className="restaurant-bookmarks"
                                        onClick={() => handleBookmarkToggle(restaurant)}
                                    >
                                        {userBookmarks.includes(restaurant.id) ? (
                                            <FillBookmark/>
                                        ) : (
                                            <Bookmark/>
                                        )}
                                        {restaurant.bookmarks_count || 0}
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h5 className="nearby-title">주변 음식점</h5>
                <ul className="restaurant-list bottom-list">
                    {sortedRestaurants.map((restaurant) => (
                        <li key={restaurant.id} className="restaurant-item">
                                <div className="restaurant-image-wrapper">
                                    {/* NaverImageSearch 컴포넌트 사용 */}
                                    <NaverImageSearch
                                        restaurantName={restaurant.place_name}
                                        onImageLoaded={handleImageLoaded}
                                    />
                                </div>
                            <div className="restaurant-info">
                                <div className="restaurant-left"
                                     onClick={() => navigate(`/recommend/restaurant/${restaurant.id}`, {state: {restaurant}})}
                                >
                                        <h6 className="restaurant-name">{restaurant.place_name}</h6>
                                        <span
                                            className="restaurant-category"><CaretRight/>{restaurant.category_name.replace('음식점 > ', '')}</span>
                                    <p className="restaurant-address">{restaurant.address_name}</p>
                                </div>
                                <div className="restaurant-right">
                                    <button
                                        className="restaurant-bookmarks"
                                        onClick={() => handleBookmarkToggle(restaurant)}
                                    >
                                        {userBookmarks.includes(restaurant.id) ? (
                                            <FillBookmark/>
                                        ) : (
                                            <Bookmark/>
                                        )}
                                        {restaurant.bookmarks_count || 0}
                                    </button>
                                    <span className="restaurant-distance">
                                        <LocationDot/>{Math.round(restaurant.distance)}m
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>

            </div>
        </div>
    );
}

export default RecommendFoodCategory;
