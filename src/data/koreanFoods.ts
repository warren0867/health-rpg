import { FoodItem } from '../types';

// 한국 식품 영양 데이터베이스 (1인분 기준)
// cal: kcal, carbs/protein/fat: g, gi: low/medium/high
export const KOREAN_FOODS: FoodItem[] = [
  // ─── 밥류 ───
  { id: 'r01', name: '흰쌀밥', nameSearch: '흰쌀밥 밥 쌀밥 white rice', cal: 315, serving: '1공기 (210g)', carbs: 69, protein: 5, fat: 1, gi: 'high', category: 'rice' },
  { id: 'r02', name: '잡곡밥', nameSearch: '잡곡밥 잡곡 현미 multigrain', cal: 290, serving: '1공기 (210g)', carbs: 60, protein: 7, fat: 2, gi: 'medium', category: 'rice' },
  { id: 'r03', name: '현미밥', nameSearch: '현미밥 현미 brown rice', cal: 280, serving: '1공기 (210g)', carbs: 58, protein: 6, fat: 2, gi: 'medium', category: 'rice' },
  { id: 'r04', name: '볶음밥', nameSearch: '볶음밥 fried rice', cal: 450, serving: '1인분 (300g)', carbs: 72, protein: 12, fat: 13, gi: 'high', category: 'rice' },
  { id: 'r05', name: '비빔밥', nameSearch: '비빔밥 bibimbap', cal: 580, serving: '1그릇 (500g)', carbs: 95, protein: 20, fat: 12, gi: 'medium', category: 'rice' },
  { id: 'r06', name: '오므라이스', nameSearch: '오므라이스 omrice omelet', cal: 520, serving: '1인분', carbs: 70, protein: 18, fat: 18, gi: 'high', category: 'rice' },
  { id: 'r07', name: '김밥', nameSearch: '김밥 gimbap 참치김밥 야채김밥', cal: 300, serving: '1줄', carbs: 52, protein: 10, fat: 7, gi: 'medium', category: 'rice' },
  { id: 'r08', name: '주먹밥', nameSearch: '주먹밥 rice ball', cal: 200, serving: '1개', carbs: 42, protein: 5, fat: 2, gi: 'high', category: 'rice' },
  { id: 'r09', name: '삼각김밥', nameSearch: '삼각김밥 편의점 convenience', cal: 175, serving: '1개', carbs: 35, protein: 5, fat: 3, gi: 'high', category: 'rice' },
  { id: 'r10', name: '덮밥 (소고기)', nameSearch: '덮밥 소고기덮밥 beef rice bowl', cal: 580, serving: '1인분', carbs: 78, protein: 28, fat: 15, gi: 'high', category: 'rice' },

  // ─── 국/찌개 ───
  { id: 's01', name: '된장찌개', nameSearch: '된장찌개 된장 doenjang', cal: 150, serving: '1인분', carbs: 12, protein: 10, fat: 6, gi: 'low', category: 'soup' },
  { id: 's02', name: '김치찌개', nameSearch: '김치찌개 kimchi jjigae', cal: 180, serving: '1인분', carbs: 10, protein: 14, fat: 8, gi: 'low', category: 'soup' },
  { id: 's03', name: '순두부찌개', nameSearch: '순두부찌개 순두부 sundubu', cal: 200, serving: '1인분', carbs: 8, protein: 16, fat: 10, gi: 'low', category: 'soup' },
  { id: 's04', name: '부대찌개', nameSearch: '부대찌개 부대 army stew', cal: 380, serving: '1인분', carbs: 35, protein: 22, fat: 16, gi: 'medium', category: 'soup' },
  { id: 's05', name: '삼계탕', nameSearch: '삼계탕 삼계 ginseng chicken soup', cal: 550, serving: '1인분', carbs: 28, protein: 50, fat: 22, gi: 'low', category: 'soup' },
  { id: 's06', name: '미역국', nameSearch: '미역국 미역 seaweed soup', cal: 80, serving: '1인분', carbs: 6, protein: 7, fat: 2, gi: 'low', category: 'soup' },
  { id: 's07', name: '설렁탕', nameSearch: '설렁탕 설농탕 ox bone soup', cal: 400, serving: '1인분', carbs: 30, protein: 35, fat: 15, gi: 'low', category: 'soup' },
  { id: 's08', name: '육개장', nameSearch: '육개장 spicy beef soup', cal: 250, serving: '1인분', carbs: 15, protein: 25, fat: 10, gi: 'low', category: 'soup' },
  { id: 's09', name: '감자탕', nameSearch: '감자탕 pork spine soup', cal: 480, serving: '1인분', carbs: 30, protein: 38, fat: 20, gi: 'medium', category: 'soup' },
  { id: 's10', name: '콩나물국', nameSearch: '콩나물국 콩나물 beansprout', cal: 60, serving: '1인분', carbs: 5, protein: 5, fat: 1, gi: 'low', category: 'soup' },
  { id: 's11', name: '해장국', nameSearch: '해장국 hangover soup', cal: 320, serving: '1인분', carbs: 22, protein: 28, fat: 12, gi: 'low', category: 'soup' },

  // ─── 면류 ───
  { id: 'n01', name: '라면', nameSearch: '라면 ramen instant noodle 신라면', cal: 500, serving: '1개', carbs: 72, protein: 11, fat: 16, gi: 'high', category: 'noodle' },
  { id: 'n02', name: '짜장면', nameSearch: '짜장면 자장면 jajangmyeon', cal: 650, serving: '1인분', carbs: 100, protein: 18, fat: 14, gi: 'high', category: 'noodle' },
  { id: 'n03', name: '짬뽕', nameSearch: '짬뽕 jjamppong seafood noodle', cal: 580, serving: '1인분', carbs: 80, protein: 25, fat: 14, gi: 'high', category: 'noodle' },
  { id: 'n04', name: '냉면', nameSearch: '냉면 naengmyeon cold noodle', cal: 430, serving: '1인분', carbs: 80, protein: 15, fat: 4, gi: 'high', category: 'noodle' },
  { id: 'n05', name: '비빔냉면', nameSearch: '비빔냉면 bibim naengmyeon', cal: 500, serving: '1인분', carbs: 90, protein: 14, fat: 6, gi: 'high', category: 'noodle' },
  { id: 'n06', name: '칼국수', nameSearch: '칼국수 kalguksu knife noodle', cal: 450, serving: '1인분', carbs: 78, protein: 18, fat: 6, gi: 'high', category: 'noodle' },
  { id: 'n07', name: '파스타', nameSearch: '파스타 pasta 스파게티 spaghetti', cal: 560, serving: '1인분', carbs: 75, protein: 18, fat: 18, gi: 'medium', category: 'noodle' },
  { id: 'n08', name: '떡볶이', nameSearch: '떡볶이 tteokbokki rice cake', cal: 380, serving: '1인분', carbs: 72, protein: 9, fat: 5, gi: 'high', category: 'noodle' },
  { id: 'n09', name: '우동', nameSearch: '우동 udon japanese noodle', cal: 420, serving: '1인분', carbs: 70, protein: 16, fat: 6, gi: 'high', category: 'noodle' },
  { id: 'n10', name: '쌀국수', nameSearch: '쌀국수 pho rice noodle', cal: 380, serving: '1인분', carbs: 68, protein: 18, fat: 4, gi: 'high', category: 'noodle' },

  // ─── 육류 ───
  { id: 'm01', name: '삼겹살', nameSearch: '삼겹살 pork belly barbeque bbq', cal: 700, serving: '200g', carbs: 0, protein: 34, fat: 62, gi: 'low', category: 'meat' },
  { id: 'm02', name: '목살', nameSearch: '목살 목삼겹 pork shoulder', cal: 520, serving: '200g', carbs: 0, protein: 36, fat: 42, gi: 'low', category: 'meat' },
  { id: 'm03', name: '소갈비', nameSearch: '갈비 소갈비 beef rib galbi', cal: 620, serving: '200g', carbs: 8, protein: 38, fat: 46, gi: 'low', category: 'meat' },
  { id: 'm04', name: '닭가슴살', nameSearch: '닭가슴살 닭 chicken breast 치킨', cal: 165, serving: '150g', carbs: 0, protein: 31, fat: 4, gi: 'low', category: 'meat' },
  { id: 'm05', name: '닭다리', nameSearch: '닭다리 치킨 chicken leg thigh', cal: 220, serving: '1개', carbs: 0, protein: 20, fat: 14, gi: 'low', category: 'meat' },
  { id: 'm06', name: '치킨 (프라이드)', nameSearch: '치킨 fried chicken 양념치킨', cal: 280, serving: '1조각', carbs: 12, protein: 20, fat: 18, gi: 'medium', category: 'meat' },
  { id: 'm07', name: '불고기', nameSearch: '불고기 bulgogi beef', cal: 350, serving: '1인분 (150g)', carbs: 15, protein: 28, fat: 18, gi: 'low', category: 'meat' },
  { id: 'm08', name: '갈비찜', nameSearch: '갈비찜 braised short rib', cal: 480, serving: '1인분', carbs: 20, protein: 40, fat: 25, gi: 'low', category: 'meat' },
  { id: 'm09', name: '제육볶음', nameSearch: '제육볶음 제육 spicy pork', cal: 400, serving: '1인분', carbs: 12, protein: 30, fat: 24, gi: 'low', category: 'meat' },
  { id: 'm10', name: '소고기 (100g)', nameSearch: '소고기 beef steak 스테이크', cal: 250, serving: '100g', carbs: 0, protein: 26, fat: 16, gi: 'low', category: 'meat' },
  { id: 'm11', name: '소시지', nameSearch: '소시지 sausage 비엔나', cal: 200, serving: '2개', carbs: 4, protein: 12, fat: 16, gi: 'low', category: 'meat' },
  { id: 'm12', name: '햄', nameSearch: '햄 ham 스팸 spam', cal: 180, serving: '100g', carbs: 5, protein: 14, fat: 12, gi: 'low', category: 'meat' },

  // ─── 단백질 (계란/두부) ───
  { id: 'p01', name: '계란', nameSearch: '계란 달걀 egg 삶은계란', cal: 78, serving: '1개', carbs: 0, protein: 6, fat: 5, gi: 'low', category: 'protein' },
  { id: 'p02', name: '계란 2개', nameSearch: '계란 달걀 egg two', cal: 156, serving: '2개', carbs: 1, protein: 12, fat: 10, gi: 'low', category: 'protein' },
  { id: 'p03', name: '계란말이', nameSearch: '계란말이 계란 rolled egg omelette', cal: 200, serving: '1인분', carbs: 4, protein: 14, fat: 14, gi: 'low', category: 'protein' },
  { id: 'p04', name: '두부', nameSearch: '두부 tofu 순두부', cal: 130, serving: '1/2모 (150g)', carbs: 4, protein: 12, fat: 7, gi: 'low', category: 'protein' },
  { id: 'p05', name: '연두부', nameSearch: '연두부 soft tofu silken', cal: 80, serving: '1팩', carbs: 3, protein: 7, fat: 4, gi: 'low', category: 'protein' },
  { id: 'p06', name: '그릭요거트', nameSearch: '그릭요거트 greek yogurt', cal: 130, serving: '1컵 (150g)', carbs: 7, protein: 18, fat: 3, gi: 'low', category: 'protein' },
  { id: 'p07', name: '우유', nameSearch: '우유 milk 저지방', cal: 125, serving: '1컵 (200ml)', carbs: 12, protein: 7, fat: 5, gi: 'low', category: 'protein' },
  { id: 'p08', name: '두유', nameSearch: '두유 soymilk soy', cal: 135, serving: '1팩 (190ml)', carbs: 16, protein: 7, fat: 5, gi: 'low', category: 'protein' },
  { id: 'p09', name: '참치캔', nameSearch: '참치 참치캔 tuna can', cal: 100, serving: '1캔 (100g)', carbs: 0, protein: 22, fat: 2, gi: 'low', category: 'seafood' },
  { id: 'p10', name: '견과류', nameSearch: '견과류 아몬드 호두 nuts almond walnut', cal: 180, serving: '한줌 (30g)', carbs: 6, protein: 5, fat: 15, gi: 'low', category: 'snack' },

  // ─── 해산물 ───
  { id: 'f01', name: '연어', nameSearch: '연어 salmon 연어구이', cal: 185, serving: '100g', carbs: 0, protein: 20, fat: 11, gi: 'low', category: 'seafood' },
  { id: 'f02', name: '고등어구이', nameSearch: '고등어 고등어구이 mackerel grilled', cal: 250, serving: '1인분', carbs: 0, protein: 22, fat: 16, gi: 'low', category: 'seafood' },
  { id: 'f03', name: '오징어볶음', nameSearch: '오징어볶음 오징어 squid stir-fry', cal: 300, serving: '1인분', carbs: 18, protein: 25, fat: 12, gi: 'low', category: 'seafood' },
  { id: 'f04', name: '새우', nameSearch: '새우 shrimp prawn', cal: 100, serving: '100g', carbs: 0, protein: 22, fat: 1, gi: 'low', category: 'seafood' },
  { id: 'f05', name: '조개국', nameSearch: '조개국 clam soup', cal: 80, serving: '1인분', carbs: 5, protein: 10, fat: 2, gi: 'low', category: 'seafood' },

  // ─── 채소 ───
  { id: 'v01', name: '브로콜리', nameSearch: '브로콜리 broccoli 찐브로콜리', cal: 55, serving: '1컵 (90g)', carbs: 10, protein: 4, fat: 1, gi: 'low', category: 'vegetable' },
  { id: 'v02', name: '양상추 샐러드', nameSearch: '샐러드 양상추 salad lettuce', cal: 25, serving: '1그릇', carbs: 4, protein: 2, fat: 0, gi: 'low', category: 'vegetable' },
  { id: 'v03', name: '시금치나물', nameSearch: '시금치 시금치나물 spinach', cal: 50, serving: '1인분', carbs: 6, protein: 4, fat: 1, gi: 'low', category: 'vegetable' },
  { id: 'v04', name: '당근', nameSearch: '당근 carrot', cal: 52, serving: '1개 (100g)', carbs: 12, protein: 1, fat: 0, gi: 'low', category: 'vegetable' },
  { id: 'v05', name: '고구마', nameSearch: '고구마 sweet potato', cal: 130, serving: '1개 (150g)', carbs: 30, protein: 2, fat: 0, gi: 'medium', category: 'vegetable' },
  { id: 'v06', name: '감자', nameSearch: '감자 potato', cal: 105, serving: '1개 (150g)', carbs: 24, protein: 3, fat: 0, gi: 'high', category: 'vegetable' },
  { id: 'v07', name: '단호박', nameSearch: '단호박 pumpkin squash', cal: 70, serving: '100g', carbs: 16, protein: 2, fat: 0, gi: 'medium', category: 'vegetable' },
  { id: 'v08', name: '김치', nameSearch: '김치 kimchi 배추김치', cal: 40, serving: '1인분 (100g)', carbs: 6, protein: 2, fat: 1, gi: 'low', category: 'vegetable' },
  { id: 'v09', name: '오이', nameSearch: '오이 cucumber', cal: 16, serving: '1개', carbs: 4, protein: 1, fat: 0, gi: 'low', category: 'vegetable' },
  { id: 'v10', name: '토마토', nameSearch: '토마토 tomato', cal: 35, serving: '1개 (150g)', carbs: 7, protein: 2, fat: 0, gi: 'low', category: 'vegetable' },

  // ─── 과일 ───
  { id: 'fr01', name: '사과', nameSearch: '사과 apple', cal: 80, serving: '1개 (200g)', carbs: 21, protein: 0, fat: 0, gi: 'low', category: 'fruit' },
  { id: 'fr02', name: '바나나', nameSearch: '바나나 banana', cal: 90, serving: '1개 (100g)', carbs: 23, protein: 1, fat: 0, gi: 'medium', category: 'fruit' },
  { id: 'fr03', name: '딸기', nameSearch: '딸기 strawberry', cal: 50, serving: '1컵 (150g)', carbs: 11, protein: 1, fat: 0, gi: 'low', category: 'fruit' },
  { id: 'fr04', name: '수박', nameSearch: '수박 watermelon', cal: 80, serving: '2조각 (300g)', carbs: 18, protein: 2, fat: 0, gi: 'high', category: 'fruit' },
  { id: 'fr05', name: '포도', nameSearch: '포도 grape', cal: 100, serving: '1송이 (150g)', carbs: 25, protein: 1, fat: 0, gi: 'medium', category: 'fruit' },
  { id: 'fr06', name: '오렌지', nameSearch: '오렌지 orange 귤', cal: 65, serving: '1개 (150g)', carbs: 16, protein: 1, fat: 0, gi: 'low', category: 'fruit' },
  { id: 'fr07', name: '블루베리', nameSearch: '블루베리 blueberry', cal: 85, serving: '1컵 (150g)', carbs: 21, protein: 1, fat: 0, gi: 'low', category: 'fruit' },
  { id: 'fr08', name: '키위', nameSearch: '키위 kiwi', cal: 60, serving: '1개 (100g)', carbs: 14, protein: 1, fat: 0, gi: 'low', category: 'fruit' },

  // ─── 패스트푸드 ───
  { id: 'ff01', name: '빅맥', nameSearch: '빅맥 big mac 맥도날드 mcdonalds burger', cal: 550, serving: '1개', carbs: 44, protein: 25, fat: 30, gi: 'high', category: 'fastfood' },
  { id: 'ff02', name: '프렌치프라이 (중)', nameSearch: '감자튀김 프렌치프라이 french fries', cal: 340, serving: '중사이즈', carbs: 43, protein: 4, fat: 16, gi: 'high', category: 'fastfood' },
  { id: 'ff03', name: '맥너겟 6조각', nameSearch: '맥너겟 nugget chicken mcnugget', cal: 270, serving: '6조각', carbs: 16, protein: 16, fat: 16, gi: 'medium', category: 'fastfood' },
  { id: 'ff04', name: '피자 (1조각)', nameSearch: '피자 pizza slice', cal: 280, serving: '1조각', carbs: 30, protein: 12, fat: 12, gi: 'high', category: 'fastfood' },
  { id: 'ff05', name: '와퍼', nameSearch: '와퍼 whopper 버거킹 burger king', cal: 660, serving: '1개', carbs: 52, protein: 32, fat: 35, gi: 'high', category: 'fastfood' },
  { id: 'ff06', name: '순대 1인분', nameSearch: '순대 sundae blood sausage', cal: 300, serving: '1인분', carbs: 32, protein: 14, fat: 12, gi: 'high', category: 'fastfood' },
  { id: 'ff07', name: '떡볶이+튀김', nameSearch: '떡볶이 튀김 포장마차', cal: 600, serving: '1인분', carbs: 100, protein: 14, fat: 16, gi: 'high', category: 'fastfood' },

  // ─── 간식/제과 ───
  { id: 'sn01', name: '과자 1봉', nameSearch: '과자 chips snack 새우깡 포카칩', cal: 350, serving: '1봉 (60g)', carbs: 48, protein: 4, fat: 16, gi: 'high', category: 'snack' },
  { id: 'sn02', name: '초콜릿', nameSearch: '초콜릿 chocolate 빼빼로', cal: 250, serving: '1개 (50g)', carbs: 30, protein: 3, fat: 14, gi: 'high', category: 'snack' },
  { id: 'sn03', name: '도넛', nameSearch: '도넛 donut doughnut', cal: 300, serving: '1개', carbs: 38, protein: 5, fat: 14, gi: 'high', category: 'snack' },
  { id: 'sn04', name: '케이크 1조각', nameSearch: '케이크 cake 생일케이크', cal: 350, serving: '1조각', carbs: 45, protein: 5, fat: 16, gi: 'high', category: 'snack' },
  { id: 'sn05', name: '식빵 2장', nameSearch: '식빵 bread toast', cal: 180, serving: '2장', carbs: 34, protein: 6, fat: 2, gi: 'high', category: 'snack' },
  { id: 'sn06', name: '크루아상', nameSearch: '크루아상 croissant 베이커리', cal: 280, serving: '1개', carbs: 28, protein: 6, fat: 16, gi: 'high', category: 'snack' },
  { id: 'sn07', name: '떡', nameSearch: '떡 rice cake 송편 인절미', cal: 150, serving: '1개 (60g)', carbs: 34, protein: 2, fat: 1, gi: 'high', category: 'snack' },
  { id: 'sn08', name: '아이스크림', nameSearch: '아이스크림 ice cream 빙수', cal: 200, serving: '1개', carbs: 28, protein: 3, fat: 8, gi: 'high', category: 'snack' },
  { id: 'sn09', name: '호떡', nameSearch: '호떡 hotteok sweet pancake', cal: 250, serving: '1개', carbs: 40, protein: 4, fat: 8, gi: 'high', category: 'snack' },
  { id: 'sn10', name: '붕어빵', nameSearch: '붕어빵 taiyaki fish cake bread', cal: 180, serving: '1개', carbs: 30, protein: 4, fat: 4, gi: 'high', category: 'snack' },
  { id: 'sn11', name: '에너지바', nameSearch: '에너지바 protein bar granola 그래놀라', cal: 200, serving: '1개', carbs: 28, protein: 8, fat: 7, gi: 'medium', category: 'snack' },

  // ─── 음료 ───
  { id: 'bv01', name: '아메리카노', nameSearch: '아메리카노 americano coffee 블랙', cal: 10, serving: '1잔', carbs: 0, protein: 0, fat: 0, gi: 'low', category: 'beverage' },
  { id: 'bv02', name: '카페라떼', nameSearch: '카페라떼 latte coffee 우유', cal: 180, serving: '1잔 (350ml)', carbs: 14, protein: 8, fat: 7, gi: 'low', category: 'beverage' },
  { id: 'bv03', name: '달콤한 커피음료', nameSearch: '달달한커피 믹스 캔커피 sweet coffee', cal: 120, serving: '1캔/1봉', carbs: 20, protein: 2, fat: 3, gi: 'high', category: 'beverage' },
  { id: 'bv04', name: '콜라', nameSearch: '콜라 coke cola soda 탄산', cal: 140, serving: '1캔 (350ml)', carbs: 38, protein: 0, fat: 0, gi: 'high', category: 'beverage' },
  { id: 'bv05', name: '오렌지주스', nameSearch: '오렌지주스 orange juice 과일주스', cal: 110, serving: '1컵 (200ml)', carbs: 26, protein: 1, fat: 0, gi: 'high', category: 'beverage' },
  { id: 'bv06', name: '맥주', nameSearch: '맥주 beer 캔맥주', cal: 150, serving: '1캔 (350ml)', carbs: 14, protein: 1, fat: 0, gi: 'high', category: 'beverage' },
  { id: 'bv07', name: '소주', nameSearch: '소주 soju', cal: 400, serving: '1병', carbs: 0, protein: 0, fat: 0, gi: 'low', category: 'beverage' },
  { id: 'bv08', name: '막걸리', nameSearch: '막걸리 makgeolli rice wine', cal: 300, serving: '1병 (750ml)', carbs: 28, protein: 4, fat: 0, gi: 'medium', category: 'beverage' },
  { id: 'bv09', name: '에너지드링크', nameSearch: '에너지드링크 energy drink 레드불 몬스터', cal: 110, serving: '1캔', carbs: 28, protein: 0, fat: 0, gi: 'high', category: 'beverage' },
  { id: 'bv10', name: '이온음료', nameSearch: '이온음료 gatorade 포카리스웨트 스포츠', cal: 50, serving: '1병 (500ml)', carbs: 14, protein: 0, fat: 0, gi: 'medium', category: 'beverage' },

  // ─── 기타 한식 ───
  { id: 'k01', name: '잡채', nameSearch: '잡채 japchae glass noodle', cal: 300, serving: '1인분', carbs: 40, protein: 10, fat: 10, gi: 'medium', category: 'korean' },
  { id: 'k02', name: '보쌈', nameSearch: '보쌈 bossam pork belly boiled', cal: 500, serving: '1인분', carbs: 10, protein: 45, fat: 30, gi: 'low', category: 'korean' },
  { id: 'k03', name: '족발', nameSearch: '족발 jokbal braised pork feet', cal: 550, serving: '1인분 (200g)', carbs: 5, protein: 42, fat: 38, gi: 'low', category: 'korean' },
  { id: 'k04', name: '해물파전', nameSearch: '해물파전 파전 seafood pancake pajeon', cal: 350, serving: '1인분', carbs: 38, protein: 16, fat: 14, gi: 'high', category: 'korean' },
  { id: 'k05', name: '빈대떡', nameSearch: '빈대떡 mung bean pancake bindaetteok', cal: 280, serving: '1장', carbs: 30, protein: 14, fat: 12, gi: 'medium', category: 'korean' },
  { id: 'k06', name: '순대볶음', nameSearch: '순대볶음 stir-fried sundae', cal: 450, serving: '1인분', carbs: 42, protein: 18, fat: 20, gi: 'high', category: 'korean' },
  { id: 'k07', name: '닭갈비', nameSearch: '닭갈비 dak galbi spicy chicken', cal: 420, serving: '1인분', carbs: 22, protein: 38, fat: 18, gi: 'low', category: 'korean' },
  { id: 'k08', name: '쌈밥', nameSearch: '쌈밥 ssambap lettuce wrap', cal: 350, serving: '1인분', carbs: 35, protein: 25, fat: 10, gi: 'medium', category: 'korean' },
];

// ─── 검색 함수 ───

export function searchFoods(query: string): FoodItem[] {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  const scored = KOREAN_FOODS.map(food => {
    let score = 0;
    if (food.name.startsWith(query)) score += 100;
    else if (food.name.includes(query)) score += 60;
    if (food.nameSearch.includes(q)) score += 30;
    return { food, score };
  })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 10).map(x => x.food);
}

export function getFoodById(id: string): FoodItem | undefined {
  return KOREAN_FOODS.find(f => f.id === id);
}

export const CATEGORY_LABELS: Record<string, string> = {
  rice: '밥류',
  soup: '국/찌개',
  noodle: '면류',
  meat: '육류',
  seafood: '해산물',
  protein: '단백질',
  vegetable: '채소',
  fruit: '과일',
  snack: '간식',
  fastfood: '패스트푸드',
  beverage: '음료',
  korean: '한식',
};
