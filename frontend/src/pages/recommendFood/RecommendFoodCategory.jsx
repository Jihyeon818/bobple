/*global kakao*/
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../../assets/style/recommendFood/RecommendFoodCategory.css';
import {Bookmark, CaretRight, LocationDot, SearchIcon} from "../../components/imgcomponents/ImgComponents";
import {TopSearch} from "../../components/SliderComponent";

function RecommendFoodCategory() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialCategory = searchParams.get('category');
    const initialKeyword = searchParams.get('keyword');
    const [category, setCategory] = useState(initialCategory || ''); // 초기값 설정
    const [keyword, setKeyword] = useState(initialKeyword || ''); // 초기값 설정
    const [restaurants, setRestaurants] = useState([]);
    const [displayedKeyword, setDisplayedKeyword] = useState(initialKeyword || ''); // 표시될 검색어 상태 추가

    const navigate = useNavigate();

    // 주변 음식점 정렬 (거리순)
    const sortedRestaurants = restaurants.slice().sort((a, b) => a.distance - b.distance);

    useEffect(() => {
        const ps = new kakao.maps.services.Places();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const
                        { latitude, longitude } = position.coords;
                    if (category) {
                        searchRestaurantsByCategory(latitude, longitude, category);
                    } else if (keyword) {
                        searchRestaurantsByKeyword(latitude, longitude, keyword);
                    }
                },
                (err) => {
                    console.error("geolocation을 사용할 수 없어요:", err.message);
                }
            );
        } else {
            console.error("geolocation을 사용할 수 없어요.");
        }

        function searchRestaurantsByCategory(latitude, longitude, category) {
            const searchOptions = {
                location: new kakao.maps.LatLng(latitude, longitude),
                radius: 2000, // 검색 반경 (미터 단위)
            };

            console.log("검색 카테고리:", category); // 검색 카테고리 출력

            // categorySearch 대신 keywordSearch 사용
            ps.keywordSearch(category, (data, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    // 카테고리 이름을 포함하는 음식점만 필터링
                    const filteredData = data.filter(restaurant => restaurant.category_name.includes(category));
                    console.log("검색 결과:", filteredData); // 검색 결과 출력
                    setRestaurants(filteredData);

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

            console.log("검색 키워드:", keyword);

            ps.keywordSearch(keyword, (data, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    console.log("검색 결과:", data);
                    setRestaurants(data);
                } else {
                    console.error("음식점 검색 실패:", status);
                }
            }, searchOptions);
        }
    }, [category]);

    const handleSearch = () => {
        const trimmedKeyword = keyword.trim();
        if (!trimmedKeyword) {
            alert('키워드를 입력해주세요!');
            return;
        }

        // 검색 키워드를 쿼리 파라미터로 설정하고 페이지 새로고침
        setSearchParams({ keyword: trimmedKeyword });
        window.location.reload();
    };

    const dummyImage = "https://t1.daumcdn.net/thumb/C84x76/?fname=http://t1.daumcdn.net/cfile/2170353A51B82DE005";

    // category가 '일본식 주점'이면 '이자카야'로 변경
    const displayedCategory = category === '일본식주점' ? '이자카야' : category;

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
            <div>
                <h3 className="category-title">
                    {(displayedCategory || displayedKeyword) && `${displayedCategory || displayedKeyword} `}
                    <span>BEST</span>
                </h3>

                <ul className="restaurant-list top-list">
                    {restaurants.slice(0, 3).map((restaurant) => (
                        <li key={restaurant.id} className="top-item">
                            <a href={restaurant.place_url} target="_blank" rel="noreferrer">
                                <img src={dummyImage} alt={restaurant.place_name} className="restaurant-image"/>
                            </a>
                            <div className="top-restaurant-info">
                                <a className={"restaurant-info-link"} href={restaurant.place_url} target="_blank"
                                   rel="noreferrer">
                                    <h6 className="restaurant-name">{restaurant.place_name}</h6>
                                </a>
                                <span
                                    className="restaurant-distance"><LocationDot/>{Math.round(restaurant.distance)}m</span>
                                <button
                                    className="restaurant-bookmarks"><Bookmark/>{restaurant.bookmarks_count}</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h5 className="nearby-title">주변 음식점</h5>
                <ul className="restaurant-list">
                    {sortedRestaurants.map((restaurant) => (
                        <li key={restaurant.id} className="restaurant-item">
                            <a href={restaurant.place_url} target="_blank" rel="noreferrer">
                                <img src={dummyImage} alt={restaurant.place_name}
                                     className="restaurant-list-image"/>
                            </a>
                            <div className="restaurant-info">
                                <a href={restaurant.place_url} target="_blank" rel="noreferrer">
                                    <h6 className="restaurant-name">{restaurant.place_name}</h6>
                                    <p className="restaurant-address">{restaurant.address_name}</p>
                                    <span className="restaurant-distance"><LocationDot/>{Math.round(restaurant.distance)}m</span>
                                    <span className="restaurant-category"><CaretRight/>{restaurant.category_name}</span>
                                </a>
                            </div>
                        </li>
                    ))}
                </ul>

            </div>
        </div>
    );
}

export default RecommendFoodCategory;
