import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../assets/style/pointShop/PointMain.css';
import 'bootstrap/dist/css/bootstrap.css';
import { Carousel } from 'react-bootstrap';
import stamp from '../../assets/images/checkstamp.png';
import {
    PointgameAvoid,
    PointgameFoodMatching,
    PointGameGacha,
    PointgameSlot
} from "../../components/imgcomponents/ImgComponents";

function PointMain() {
    const location = useLocation();
    const navigate = useNavigate();
    const initialTab = location.state?.selectedTab || '기프티콘';
    const [selectedTab, setSelectedTab] = useState(initialTab);
    const [selectedItemTab, setSelectedItemTab] = useState('보유중');
    const [selectedCategory, setSelectedCategory] = useState('전체');
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [products, setProducts] = useState([]);
    const [purchasedProducts, setPurchasedProducts] = useState([]);
    const [unusedGiftCount, setUnusedGiftCount] = useState(0);
    const [sortOrder, setSortOrder] = useState('desc');

    const userIdx = localStorage.getItem('userIdx');
    const token = localStorage.getItem('token');

    const categories = ['전체', '카페', '치킨', '햄버거', '피자', '편의점'];

    const [playedGamesToday, setPlayedGamesToday] = useState([]);

    // Fetch products or purchased products based on selectedTab
    useEffect(() => {
        if (!token) {
            alert('로그인이 필요합니다.');
            navigate('/login'); // Redirect to login if not authenticated
            return;
        }

        if (selectedTab === '기프티콘') {
            axios.get('http://localhost:8080/api/PointMain', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            })
                .then(response => {
                    //console.log('Fetched Products:', response.data); // 데이터 구조 확인
                    setProducts(response.data);
                })
                .catch(error => {
                    //console.error('There was an error fetching the products!', error);
                    alert('상품 정보를 가져오는 데 실패했습니다.');
                });
        }

        if (selectedTab === '보관함') {
            const isUsed = selectedItemTab === '사용완료';
            axios.get(`http://localhost:8080/api/GiftPurchase/${userIdx}?sort=${sortOrder}&isUsed=${isUsed}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                withCredentials: true
            })
                .then(response => {
                    //console.log('Fetched Purchased Products:', response.data); // 데이터 구조 확인
                    setPurchasedProducts(response.data);
                })
                .catch(error => {
                    //console.error('There was an error fetching the purchased products!', error);
                    alert('구매한 상품 정보를 가져오는 데 실패했습니다.');
                });
        }
    }, [userIdx, selectedTab, selectedItemTab, sortOrder, token]);

    // Fetch unused gift count
    useEffect(() => {
        if (!token) return;

        axios.get(`http://localhost:8080/api/GiftPurchase/${userIdx}?isUsed=false`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        })
            .then(response => {
                setUnusedGiftCount(response.data.length);
            })
            .catch(error => {
                //console.error('There was an error fetching the unused gift count!', error);
            });
    }, [userIdx, token]);

    useEffect(() => {
        const fetchPlayedGamesToday = async () => {
            if (!token || !userIdx) return; // 토큰 또는 userIdx가 없는 경우 함수 종료

            const today = new Date().toISOString().slice(0, 10); // 오늘 날짜 YYYY-MM-DD 형식으로 가져오기

            try {
                const response = await axios.get(`http://localhost:8080/api/points/${userIdx}/today`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    withCredentials: true,
                    params: {
                        date: today
                    }
                });

                const playedGameComments = response.data.map(point => point.pointComment);
                setPlayedGamesToday(playedGameComments);
            } catch (error) {
                //console.error('오늘 플레이한 게임 정보 가져오기 실패:', error);
                // 추가적인 에러 처리 로직 (예: 사용자에게 에러 메시지 표시)
            }
        };

        fetchPlayedGamesToday();
    }, [userIdx, token]);

    const handleTabClick = (tab) => {
        setSelectedTab(tab);
    };

    const handleItemTabClick = (tab) => {
        setSelectedItemTab(tab);
    };

    const handleGameClick = (gameComment) => {
        const playedToday = playedGamesToday.some(comment =>
            comment === gameComment || comment === `${gameComment} 실패`
        );
        if (playedToday) {
            alert("오늘 이미 플레이한 게임입니다.");
        } else {
            // 해당 게임 페이지로 이동하는 로직 추가
            switch (gameComment) {
                case "가챠 게임":
                    navigate('/point/pointGame/GachaGame');
                    break;
                case "음식 확대사진 맞추기 게임":
                    navigate('/point/pointGame/MatchingGame');
                    break;
                case "과일 피하기 게임":
                    navigate('/point/pointGame/FruitsAvoid');
                    break;
                case "슬롯 게임":
                    navigate('/point/pointGame/SlotGame');
                    break;
                default:
                    //console.error("알 수 없는 게임:", gameComment);
            }
        }
    };


    const movegiftDetail = (productIdx) => {
        navigate('/point/pointGifticonDetail', { state: { productIdx } });
    };

    const moveGifticonBarcode = (purchaseIdx) => {
        navigate('/point/GifticonBarcode', { state: { purchaseIdx } });
    };

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
    };

    const handleCarouselSelect = (selectedIndex) => {
        setCarouselIndex(selectedIndex);
    };

    const handleSortOrderChange = (event) => {
        setSortOrder(event.target.value);
    };

    // Filter products based on category
    const filteredProducts = selectedCategory === '전체'
        ? products
        : products.filter(product => product.giftCategory === selectedCategory);

    // Filter purchased products based on category
    const filteredPurchasedProducts = selectedCategory === '전체'
        ? purchasedProducts
        : purchasedProducts.filter(product => product.pointShop?.giftCategory === selectedCategory);

    return (
        <>
            <div className="point-tabs-nav">
                <div className="point-tab">
                    <Tab name="기프티콘" onClick={() => handleTabClick('기프티콘')} isActive={selectedTab === '기프티콘'} />
                </div>
                <div className="point-tab">
                    <Tab name="게임" onClick={() => handleTabClick('게임')} isActive={selectedTab === '게임'} />
                </div>
                <div className="point-tab">
                    <Tab name="보관함" onClick={() => handleTabClick('보관함')} isActive={selectedTab === '보관함'} />
                </div>
            </div>
            {selectedTab === '기프티콘' && (
                <>
                    <Carousel fade activeIndex={carouselIndex} onSelect={handleCarouselSelect} className="carousel-container">
                        <Carousel.Item className="carousel-item">
                            <img
                                style={{ height: "200px" }}
                                className="d-block w-100"
                                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTzm4YgqWggUVzHi8jNDtIr-i-NxLW-ZtL3tA&s"
                            />
                        </Carousel.Item>
                        <Carousel.Item className="carousel-item">
                            <img
                                style={{ height: "200px", background: "#061A30" }}
                                className="d-block w-100"
                                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgiWFkbE8ddrIx5ngWQOG1iqB1H0eRh6w6iw&s"
                            />
                        </Carousel.Item>
                    </Carousel>

                    <div className="category-btn-container">
                        <div className="category-btns">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryClick(category)}
                                    className={selectedCategory === category ? 'active' : ''}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="category-container">
                        <div className="product-list">
                            {filteredProducts.map(product => (
                                <button key={product.giftIdx} className="product-item" onClick={() => movegiftDetail(product.giftIdx)}>
                                    <img src={product.giftImageUrl} alt={product.giftDescription} />
                                    <h3>{product.giftBrand}</h3>
                                    <h6>{product.giftDescription}</h6>
                                    <p>{product.giftPoint}P</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
            {selectedTab === '게임' && (
                <>
                    <h2 className="game-header">"Point Game"</h2>
                    <div className="point-game-btns">
                        <button className="game-button gacha" onClick={() => handleGameClick("가챠 게임")}>
                            <PointGameGacha/>
                        </button>
                        <button className="game-button food-matching" onClick={() => handleGameClick("음식 확대사진 맞추기 게임")}>
                            <PointgameFoodMatching/>
                        </button>
                        <button className="game-button avoid-fruits" onClick={() => handleGameClick("과일 피하기 게임")}>
                            <PointgameAvoid/>
                        </button>
                        <button className="game-button slot-machine" onClick={() => handleGameClick("슬롯 게임")}>
                            <PointgameSlot/>
                        </button>
                    </div>
                </>
            )}

            {selectedTab === '보관함' && (
                <>
                    <div className="category-btn-container">
                        <div className="category-btns">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryClick(category)}
                                    className={selectedCategory === category ? 'active' : ''}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="sort-select-container">
                        <h3 className="item-header">사용가능한 선물이<br/>{unusedGiftCount}개 남아있어요.</h3>
                        <select onChange={handleSortOrderChange} value={sortOrder} className="sort-select">
                            <option value="desc" className="item-select">최신순</option>
                            <option value="asc" className="item-select">오래된순</option>
                        </select>
                    </div>
                    <div className="item-tabs-nav">
                        <div className="point-tab">
                            <Tab name="보유중" onClick={() => handleItemTabClick('보유중')}
                                 isActive={selectedItemTab === '보유중'}/>
                        </div>
                        <div className="point-tab">
                            <Tab name="사용완료" onClick={() => handleItemTabClick('사용완료')}
                                 isActive={selectedItemTab === '사용완료'}/>
                        </div>
                    </div>
                    {selectedItemTab === '보유중' && (
                        <>
                            <div className="category-container">
                                <div className="product-list">
                                    {filteredPurchasedProducts.map(product => (
                                        <button key={product.purchaseIdx} className="product-item"
                                                onClick={() => moveGifticonBarcode(product.purchaseIdx)}>
                                            <img src={product.pointShop?.giftImageUrl || 'default_image_url'}
                                                 alt={product.pointShop?.giftDescription || 'No description'}/>
                                            <h3>{product.pointShop?.giftBrand}</h3>
                                            <h6>{product.pointShop?.giftDescription || 'No description'}</h6>
                                            <p>{product.pointShop?.giftPoint}P</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    {selectedItemTab === '사용완료' && (
                        <>
                            <div className="category-container-blur">
                                <div className="product-list">
                                    {filteredPurchasedProducts.map(product => (
                                        <button key={product.purchaseIdx} className="product-item item-blur"
                                                onClick={() => moveGifticonBarcode(product.pointShop?.giftIdx)}>
                                            <img src={stamp} alt="stamp" className="stamp-image"/>
                                            <img src={product.pointShop?.giftImageUrl || 'default_image_url'}
                                                 alt={product.pointShop?.giftDescription || 'No description'}/>
                                            <h3>{product.pointShop?.giftBrand}</h3>
                                            <h6>{product.pointShop?.giftDescription || 'No description'}</h6>
                                            <p>{product.pointShop?.giftPoint}P</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </>
    );
}

function Tab({name, onClick, isActive}) {
    return (
        <button onClick={() => onClick(name)} className={`tab-button ${isActive ? 'active' : ''}`}>
            {name}
        </button>
    );
}

export default PointMain;