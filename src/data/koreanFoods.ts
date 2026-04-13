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
  { id: 'r07', name: '김밥 (1줄)', nameSearch: '김밥 gimbap 참치김밥 야채김밥 한줄', cal: 300, serving: '1줄 (10개)', carbs: 52, protein: 10, fat: 7, gi: 'medium', category: 'rice' },
  { id: 'r07b', name: '김밥 1개', nameSearch: '김밥 gimbap 한개 낱개', cal: 30, serving: '1개', carbs: 5, protein: 1, fat: 0.7, gi: 'medium', category: 'rice' },
  { id: 'r07c', name: '김밥 3개', nameSearch: '김밥 gimbap 세개 3개', cal: 90, serving: '3개', carbs: 15, protein: 3, fat: 2, gi: 'medium', category: 'rice' },
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
  { id: 'n11', name: '수제비', nameSearch: '수제비 sujebi hand-torn noodle soup', cal: 380, serving: '1인분', carbs: 68, protein: 12, fat: 6, gi: 'high', category: 'noodle' },
  { id: 'n12', name: '얼큰수제비', nameSearch: '얼큰수제비 얼큰 수제비 spicy sujebi', cal: 420, serving: '1인분', carbs: 70, protein: 13, fat: 8, gi: 'high', category: 'noodle' },
  { id: 'n13', name: '잔치국수', nameSearch: '잔치국수 국수 vermicelli soup', cal: 350, serving: '1인분', carbs: 62, protein: 14, fat: 4, gi: 'high', category: 'noodle' },
  { id: 'n14', name: '비빔국수', nameSearch: '비빔국수 bibim guksu spicy noodle', cal: 420, serving: '1인분', carbs: 78, protein: 12, fat: 6, gi: 'high', category: 'noodle' },
  { id: 'n15', name: 'soba·메밀국수', nameSearch: '메밀국수 메밀 soba buckwheat', cal: 320, serving: '1인분', carbs: 60, protein: 14, fat: 2, gi: 'medium', category: 'noodle' },

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
  { id: 'p01', name: '계란 (삶은)', nameSearch: '계란 달걀 egg 삶은계란 boiled', cal: 78, serving: '1개', carbs: 0, protein: 6, fat: 5, gi: 'low', category: 'protein' },
  { id: 'p02', name: '계란 2개', nameSearch: '계란 달걀 egg two 삶은', cal: 156, serving: '2개', carbs: 1, protein: 12, fat: 10, gi: 'low', category: 'protein' },
  { id: 'p03', name: '계란말이', nameSearch: '계란말이 계란 rolled egg omelette', cal: 200, serving: '1인분', carbs: 4, protein: 14, fat: 14, gi: 'low', category: 'protein' },
  { id: 'p03b', name: '계란후라이', nameSearch: '계란후라이 후라이 계란 달걀 fried egg sunny side up', cal: 92, serving: '1개', carbs: 0, protein: 6, fat: 7, gi: 'low', category: 'protein' },
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
  { id: 'k09', name: '갈비탕', nameSearch: '갈비탕 beef rib soup', cal: 480, serving: '1인분', carbs: 15, protein: 42, fat: 28, gi: 'low', category: 'korean' },
  { id: 'k10', name: '추어탕', nameSearch: '추어탕 loach soup', cal: 220, serving: '1인분', carbs: 12, protein: 20, fat: 10, gi: 'low', category: 'korean' },
  { id: 'k11', name: '곰탕', nameSearch: '곰탕 beef bone soup', cal: 380, serving: '1인분', carbs: 10, protein: 38, fat: 22, gi: 'low', category: 'korean' },
  { id: 'k12', name: '순대국밥', nameSearch: '순대국밥 sundae gukbap', cal: 550, serving: '1인분', carbs: 55, protein: 28, fat: 22, gi: 'high', category: 'korean' },
  { id: 'k13', name: '된장국', nameSearch: '된장국 doenjang soup', cal: 80, serving: '1인분', carbs: 6, protein: 6, fat: 3, gi: 'low', category: 'korean' },
  { id: 'k14', name: '깍두기', nameSearch: '깍두기 cubed radish kimchi', cal: 20, serving: '100g', carbs: 4, protein: 1, fat: 0, gi: 'low', category: 'vegetable' },
  { id: 'k15', name: '잡채밥', nameSearch: '잡채밥 japchae rice', cal: 580, serving: '1인분', carbs: 95, protein: 16, fat: 12, gi: 'high', category: 'korean' },

  // ─── 편의점 ───
  { id: 'cv01', name: '삼각김밥 (참치마요)', nameSearch: '삼각김밥 참치마요 tuna mayo convenience', cal: 220, serving: '1개', carbs: 38, protein: 8, fat: 5, gi: 'high', category: 'fastfood' },
  { id: 'cv02', name: '삼각김밥 (불고기)', nameSearch: '삼각김밥 불고기 bulgogi convenience', cal: 200, serving: '1개', carbs: 36, protein: 7, fat: 4, gi: 'high', category: 'fastfood' },
  { id: 'cv03', name: '컵라면 (신라면)', nameSearch: '컵라면 신라면 cup ramen noodle', cal: 374, serving: '1개', carbs: 54, protein: 9, fat: 12, gi: 'high', category: 'noodle' },
  { id: 'cv04', name: '컵라면 (육개장)', nameSearch: '컵라면 육개장 cup ramen', cal: 310, serving: '1개', carbs: 46, protein: 8, fat: 10, gi: 'high', category: 'noodle' },
  { id: 'cv05', name: '편의점 도시락 (불고기)', nameSearch: '도시락 불고기 lunchbox convenience', cal: 620, serving: '1개', carbs: 90, protein: 25, fat: 16, gi: 'high', category: 'fastfood' },
  { id: 'cv06', name: '편의점 도시락 (제육)', nameSearch: '도시락 제육 spicy pork lunchbox', cal: 650, serving: '1개', carbs: 92, protein: 24, fat: 18, gi: 'high', category: 'fastfood' },
  { id: 'cv07', name: '편의점 샌드위치', nameSearch: '샌드위치 편의점 sandwich convenience', cal: 280, serving: '1개', carbs: 36, protein: 12, fat: 10, gi: 'medium', category: 'fastfood' },
  { id: 'cv08', name: '편의점 햄버거', nameSearch: '햄버거 편의점 burger convenience', cal: 350, serving: '1개', carbs: 40, protein: 15, fat: 14, gi: 'high', category: 'fastfood' },
  { id: 'cv09', name: '훈제란', nameSearch: '훈제란 훈제 계란 smoked egg', cal: 90, serving: '2개', carbs: 1, protein: 12, fat: 6, gi: 'low', category: 'protein' },
  { id: 'cv10', name: '소세지빵', nameSearch: '소세지빵 소시지빵 sausage bread', cal: 310, serving: '1개', carbs: 40, protein: 10, fat: 12, gi: 'high', category: 'snack' },
  { id: 'cv11', name: '닭가슴살 (편의점)', nameSearch: '닭가슴살 편의점 chicken breast pack', cal: 100, serving: '1팩 (100g)', carbs: 1, protein: 22, fat: 2, gi: 'low', category: 'meat' },
  { id: 'cv12', name: '두유 (삼육)', nameSearch: '두유 삼육 두유 soy milk', cal: 190, serving: '1팩 (190ml)', carbs: 22, protein: 9, fat: 7, gi: 'low', category: 'beverage' },
  { id: 'cv13', name: '그래놀라바', nameSearch: '그래놀라바 granola bar', cal: 180, serving: '1개', carbs: 26, protein: 4, fat: 7, gi: 'medium', category: 'snack' },
  { id: 'cv14', name: '바나나우유', nameSearch: '바나나우유 banana milk 빙그레', cal: 130, serving: '1개 (240ml)', carbs: 24, protein: 4, fat: 2, gi: 'medium', category: 'beverage' },
  { id: 'cv15', name: '오뚜기 컵밥', nameSearch: '컵밥 오뚜기 cup rice', cal: 320, serving: '1개', carbs: 68, protein: 7, fat: 3, gi: 'high', category: 'fastfood' },

  // ─── 카페 ───
  { id: 'cafe01', name: '아메리카노', nameSearch: '아메리카노 americano coffee 커피', cal: 10, serving: '1잔 (355ml)', carbs: 1, protein: 0, fat: 0, gi: 'low', category: 'beverage' },
  { id: 'cafe02', name: '라떼', nameSearch: '라떼 latte 카페라떼 cafe latte', cal: 180, serving: '1잔 (355ml)', carbs: 18, protein: 9, fat: 7, gi: 'medium', category: 'beverage' },
  { id: 'cafe03', name: '카푸치노', nameSearch: '카푸치노 cappuccino', cal: 120, serving: '1잔', carbs: 12, protein: 7, fat: 5, gi: 'medium', category: 'beverage' },
  { id: 'cafe04', name: '달달한 라떼 (바닐라/카라멜)', nameSearch: '바닐라라떼 카라멜라떼 vanilla latte caramel', cal: 290, serving: '1잔 (355ml)', carbs: 42, protein: 8, fat: 9, gi: 'high', category: 'beverage' },
  { id: 'cafe05', name: '딸기라떼', nameSearch: '딸기라떼 strawberry latte', cal: 320, serving: '1잔', carbs: 52, protein: 7, fat: 8, gi: 'high', category: 'beverage' },
  { id: 'cafe06', name: '크루아상', nameSearch: '크루아상 croissant 버터', cal: 280, serving: '1개', carbs: 30, protein: 6, fat: 16, gi: 'high', category: 'snack' },
  { id: 'cafe07', name: '베이글', nameSearch: '베이글 bagel', cal: 260, serving: '1개', carbs: 52, protein: 10, fat: 2, gi: 'high', category: 'snack' },
  { id: 'cafe08', name: '치즈케이크', nameSearch: '치즈케이크 cheesecake', cal: 380, serving: '1조각', carbs: 38, protein: 8, fat: 22, gi: 'medium', category: 'snack' },
  { id: 'cafe09', name: '초코케이크', nameSearch: '초코케이크 chocolate cake', cal: 420, serving: '1조각', carbs: 55, protein: 6, fat: 20, gi: 'high', category: 'snack' },
  { id: 'cafe10', name: '마들렌', nameSearch: '마들렌 madeleine', cal: 160, serving: '1개', carbs: 20, protein: 3, fat: 8, gi: 'high', category: 'snack' },
  { id: 'cafe11', name: '스콘', nameSearch: '스콘 scone', cal: 310, serving: '1개', carbs: 42, protein: 6, fat: 13, gi: 'high', category: 'snack' },
  { id: 'cafe12', name: '녹차라떼', nameSearch: '녹차라떼 matcha latte green tea', cal: 250, serving: '1잔', carbs: 38, protein: 8, fat: 7, gi: 'medium', category: 'beverage' },
  { id: 'cafe13', name: '에이드 (자몽/레몬)', nameSearch: '에이드 자몽 레몬 ade grapefruit lemon', cal: 200, serving: '1잔', carbs: 50, protein: 0, fat: 0, gi: 'high', category: 'beverage' },
  { id: 'cafe14', name: '샐러드 (카페)', nameSearch: '샐러드 카페 cafe salad', cal: 150, serving: '1개', carbs: 12, protein: 10, fat: 6, gi: 'low', category: 'vegetable' },
  { id: 'cafe15', name: '단팥빵', nameSearch: '단팥빵 red bean bread 팥빵', cal: 280, serving: '1개', carbs: 52, protein: 7, fat: 5, gi: 'high', category: 'snack' },

  // ─── 배달 음식 ───
  { id: 'dl01', name: '피자 (1조각)', nameSearch: '피자 pizza slice 도미노 피자헛', cal: 280, serving: '1조각', carbs: 32, protein: 13, fat: 11, gi: 'high', category: 'fastfood' },
  { id: 'dl02', name: '피자 (판 1/4)', nameSearch: '피자 pizza quarter', cal: 560, serving: '1/4판', carbs: 64, protein: 26, fat: 22, gi: 'high', category: 'fastfood' },
  { id: 'dl03', name: '양념치킨 (반)', nameSearch: '양념치킨 반마리 spicy fried chicken half', cal: 850, serving: '반마리', carbs: 52, protein: 55, fat: 48, gi: 'high', category: 'meat' },
  { id: 'dl04', name: '후라이드치킨 (반)', nameSearch: '후라이드 반마리 fried chicken half', cal: 780, serving: '반마리', carbs: 30, protein: 58, fat: 50, gi: 'medium', category: 'meat' },
  { id: 'dl05', name: '탕수육', nameSearch: '탕수육 sweet sour pork', cal: 650, serving: '1인분', carbs: 55, protein: 28, fat: 32, gi: 'high', category: 'meat' },
  { id: 'dl06', name: '짜장면 (배달)', nameSearch: '짜장면 자장면 배달 delivery jajang', cal: 720, serving: '1인분 (大)', carbs: 110, protein: 20, fat: 16, gi: 'high', category: 'noodle' },
  { id: 'dl07', name: '떡볶이 (배달)', nameSearch: '떡볶이 배달 tteokbokki delivery', cal: 450, serving: '1인분', carbs: 85, protein: 12, fat: 7, gi: 'high', category: 'noodle' },
  { id: 'dl08', name: '순대 (배달)', nameSearch: '순대 sundae delivery', cal: 350, serving: '1인분', carbs: 35, protein: 18, fat: 16, gi: 'medium', category: 'korean' },
  { id: 'dl09', name: '초밥 (8피스)', nameSearch: '초밥 sushi 스시 8pcs', cal: 380, serving: '8피스', carbs: 66, protein: 18, fat: 4, gi: 'high', category: 'seafood' },
  { id: 'dl10', name: '회덮밥', nameSearch: '회덮밥 raw fish rice bowl', cal: 520, serving: '1인분', carbs: 76, protein: 28, fat: 10, gi: 'high', category: 'seafood' },
  { id: 'dl11', name: '마라탕', nameSearch: '마라탕 mala hotpot spicy', cal: 680, serving: '1인분', carbs: 42, protein: 35, fat: 38, gi: 'medium', category: 'noodle' },
  { id: 'dl12', name: '샤브샤브', nameSearch: '샤브샤브 shabu hot pot', cal: 450, serving: '1인분', carbs: 22, protein: 40, fat: 20, gi: 'low', category: 'meat' },
  { id: 'dl13', name: '버거 세트 (롯데리아)', nameSearch: '버거세트 롯데리아 lotteria burger set', cal: 780, serving: '1세트', carbs: 90, protein: 28, fat: 35, gi: 'high', category: 'fastfood' },
  { id: 'dl14', name: '와플', nameSearch: '와플 waffle', cal: 320, serving: '1개', carbs: 46, protein: 7, fat: 12, gi: 'high', category: 'snack' },
  { id: 'dl15', name: '떡꼬치', nameSearch: '떡꼬치 rice cake skewer', cal: 180, serving: '1개', carbs: 38, protein: 3, fat: 2, gi: 'high', category: 'snack' },

  // ─── 간식 / 과자 ───
  { id: 'sn01', name: '초코파이', nameSearch: '초코파이 choco pie', cal: 180, serving: '1개', carbs: 26, protein: 2, fat: 7, gi: 'high', category: 'snack' },
  { id: 'sn02', name: '새우깡', nameSearch: '새우깡 shrimp cracker', cal: 130, serving: '1봉 (절반)', carbs: 18, protein: 2, fat: 5, gi: 'high', category: 'snack' },
  { id: 'sn03', name: '포카칩', nameSearch: '포카칩 poca chip potato chips', cal: 160, serving: '1봉 (절반)', carbs: 20, protein: 2, fat: 8, gi: 'high', category: 'snack' },
  { id: 'sn04', name: '에너지바 (단백질)', nameSearch: '에너지바 단백질바 protein bar', cal: 200, serving: '1개', carbs: 22, protein: 15, fat: 6, gi: 'medium', category: 'snack' },
  { id: 'sn05', name: '아이스크림 (바)', nameSearch: '아이스크림 ice cream bar', cal: 200, serving: '1개', carbs: 26, protein: 3, fat: 9, gi: 'high', category: 'snack' },
  { id: 'sn06', name: '아이스크림 (컵)', nameSearch: '아이스크림 컵 ice cream cup', cal: 280, serving: '1컵', carbs: 36, protein: 4, fat: 13, gi: 'high', category: 'snack' },
  { id: 'sn07', name: '떡 (인절미)', nameSearch: '인절미 떡 rice cake glutinous', cal: 180, serving: '3개', carbs: 38, protein: 4, fat: 2, gi: 'high', category: 'snack' },
  { id: 'sn08', name: '꿀떡', nameSearch: '꿀떡 honey rice cake', cal: 160, serving: '2개', carbs: 36, protein: 2, fat: 1, gi: 'high', category: 'snack' },
  { id: 'sn09', name: '약과', nameSearch: '약과 yakkwa korean honey cookie', cal: 200, serving: '2개', carbs: 32, protein: 2, fat: 7, gi: 'high', category: 'snack' },
  { id: 'sn10', name: '호두과자', nameSearch: '호두과자 walnut cookie', cal: 250, serving: '3개', carbs: 38, protein: 6, fat: 9, gi: 'high', category: 'snack' },
  { id: 'sn11', name: '다크초콜릿', nameSearch: '다크초콜릿 dark chocolate', cal: 170, serving: '30g', carbs: 18, protein: 2, fat: 12, gi: 'low', category: 'snack' },
  { id: 'sn12', name: '밀크초콜릿', nameSearch: '밀크초콜릿 milk chocolate', cal: 160, serving: '30g', carbs: 20, protein: 2, fat: 9, gi: 'high', category: 'snack' },
  { id: 'sn13', name: '팝콘', nameSearch: '팝콘 popcorn', cal: 110, serving: '1컵', carbs: 14, protein: 2, fat: 4, gi: 'high', category: 'snack' },
  { id: 'sn14', name: '젤리', nameSearch: '젤리 jelly gummy', cal: 120, serving: '1봉', carbs: 30, protein: 0, fat: 0, gi: 'high', category: 'snack' },
  { id: 'sn15', name: '빵 (식빵)', nameSearch: '식빵 bread toast 토스트', cal: 130, serving: '2장', carbs: 24, protein: 5, fat: 2, gi: 'high', category: 'snack' },

  // ─── 단백질 음료 & 운동 후 식품 ───
  { id: 'sp01', name: '프로틴 쉐이크 (초코)', nameSearch: '프로틴 쉐이크 초코 protein shake chocolate whey 단백질', cal: 150, serving: '1스쿱 (물 250ml)', carbs: 5, protein: 25, fat: 2, gi: 'low', category: 'protein' },
  { id: 'sp06', name: '프로틴 쉐이크 (바닐라)', nameSearch: '프로틴 쉐이크 바닐라 protein shake vanilla whey 단백질', cal: 145, serving: '1스쿱 (물 250ml)', carbs: 4, protein: 25, fat: 2, gi: 'low', category: 'protein' },
  { id: 'sp07', name: '프로틴 쉐이크 (딸기)', nameSearch: '프로틴 쉐이크 딸기 protein shake strawberry 단백질', cal: 148, serving: '1스쿱 (물 250ml)', carbs: 6, protein: 24, fat: 2, gi: 'low', category: 'protein' },
  { id: 'sp08', name: 'RTD 프로틴 음료', nameSearch: 'RTD 단백질 음료 ready to drink protein 닭가슴살 음료', cal: 130, serving: '1병 (250ml)', carbs: 5, protein: 22, fat: 2, gi: 'low', category: 'protein' },
  { id: 'sp09', name: '그릭 요거트', nameSearch: '그릭 요거트 greek yogurt 플레인', cal: 100, serving: '1개 (150g)', carbs: 6, protein: 15, fat: 1, gi: 'low', category: 'protein' },
  { id: 'sp10', name: '그릭 요거트 (과일)', nameSearch: '그릭 요거트 과일 greek yogurt fruit', cal: 140, serving: '1개 (150g)', carbs: 18, protein: 12, fat: 1, gi: 'medium', category: 'protein' },
  { id: 'sp11', name: '프로틴바', nameSearch: '프로틴바 protein bar 단백질바 에너지바', cal: 210, serving: '1개 (60g)', carbs: 20, protein: 20, fat: 7, gi: 'medium', category: 'protein' },
  { id: 'sp12', name: '이온 음료 (포카리스웨트)', nameSearch: '이온 포카리스웨트 pocari sweat sports drink', cal: 45, serving: '1캔 (240ml)', carbs: 11, protein: 0, fat: 0, gi: 'medium', category: 'protein' },
  { id: 'sp13', name: '이온 음료 (게토레이)', nameSearch: '게토레이 gatorade sports drink 스포츠', cal: 50, serving: '1병 (240ml)', carbs: 14, protein: 0, fat: 0, gi: 'medium', category: 'protein' },
  { id: 'sp14', name: '아몬드 브리즈', nameSearch: '아몬드 브리즈 almond breeze 아몬드밀크', cal: 30, serving: '1팩 (190ml)', carbs: 3, protein: 1, fat: 2, gi: 'low', category: 'protein' },
  { id: 'sp15', name: '귀리 우유 (오트밀크)', nameSearch: '오트밀크 귀리우유 oat milk', cal: 90, serving: '1팩 (200ml)', carbs: 16, protein: 3, fat: 2, gi: 'medium', category: 'protein' },
  { id: 'sp16', name: '소이 프로틴 (두유단백질)', nameSearch: '소이 프로틴 두유 soy protein isolate', cal: 120, serving: '1스쿱 (물 250ml)', carbs: 3, protein: 22, fat: 1, gi: 'low', category: 'protein' },
  { id: 'sp02', name: '닭가슴살 샐러드', nameSearch: '닭가슴살 샐러드 chicken salad', cal: 220, serving: '1인분', carbs: 12, protein: 28, fat: 6, gi: 'low', category: 'meat' },
  { id: 'sp03', name: '고구마 + 닭가슴살', nameSearch: '고구마 닭가슴살 sweet potato chicken', cal: 280, serving: '1세트', carbs: 32, protein: 25, fat: 3, gi: 'medium', category: 'meat' },
  { id: 'sp04', name: '오트밀', nameSearch: '오트밀 oatmeal 귀리', cal: 150, serving: '1인분 (40g)', carbs: 27, protein: 5, fat: 3, gi: 'low', category: 'snack' },
  { id: 'sp05', name: '바나나 + 우유', nameSearch: '바나나 우유 banana milk combo', cal: 215, serving: '1세트', carbs: 35, protein: 8, fat: 5, gi: 'medium', category: 'protein' },

  // ─── 음료 추가 ───
  { id: 'bv11', name: '아이스티', nameSearch: '아이스티 ice tea 복숭아', cal: 80, serving: '1캔 (340ml)', carbs: 20, protein: 0, fat: 0, gi: 'high', category: 'beverage' },
  { id: 'bv12', name: '탄산수', nameSearch: '탄산수 sparkling water 제로', cal: 0, serving: '1캔', carbs: 0, protein: 0, fat: 0, gi: 'low', category: 'beverage' },
  { id: 'bv13', name: '오렌지주스', nameSearch: '오렌지주스 orange juice', cal: 110, serving: '1컵 (240ml)', carbs: 26, protein: 2, fat: 0, gi: 'high', category: 'beverage' },
  { id: 'bv14', name: '두유 (무가당)', nameSearch: '두유 무가당 unsweetened soy milk', cal: 90, serving: '1팩 (190ml)', carbs: 6, protein: 7, fat: 4, gi: 'low', category: 'beverage' },
  { id: 'bv15', name: '초코우유', nameSearch: '초코우유 chocolate milk', cal: 200, serving: '1팩 (200ml)', carbs: 30, protein: 7, fat: 5, gi: 'high', category: 'beverage' },
  { id: 'bv16', name: '요구르트 (야쿠르트)', nameSearch: '요구르트 야쿠르트 yakult yogurt drink', cal: 80, serving: '1개 (65ml)', carbs: 14, protein: 1, fat: 0, gi: 'high', category: 'beverage' },
  { id: 'bv17', name: '식혜', nameSearch: '식혜 sikhye sweet rice drink', cal: 140, serving: '1캔', carbs: 34, protein: 1, fat: 0, gi: 'high', category: 'beverage' },
  { id: 'bv18', name: '커피믹스', nameSearch: '커피믹스 coffee mix 맥심', cal: 55, serving: '1봉', carbs: 9, protein: 1, fat: 2, gi: 'medium', category: 'beverage' },

  // ─── 양식 / 기타 ───
  { id: 'ws01', name: '리조또', nameSearch: '리조또 risotto', cal: 480, serving: '1인분', carbs: 62, protein: 14, fat: 18, gi: 'high', category: 'noodle' },
  { id: 'ws02', name: '카레라이스', nameSearch: '카레라이스 curry rice 카레', cal: 520, serving: '1인분', carbs: 82, protein: 16, fat: 12, gi: 'high', category: 'rice' },
  { id: 'ws03', name: '오므라이스', nameSearch: '오므라이스 omurice omelette rice', cal: 520, serving: '1인분', carbs: 70, protein: 18, fat: 18, gi: 'high', category: 'rice' },
  { id: 'ws04', name: '돈까스', nameSearch: '돈까스 tonkatsu pork cutlet', cal: 580, serving: '1인분', carbs: 48, protein: 32, fat: 26, gi: 'high', category: 'meat' },
  { id: 'ws05', name: '함박스테이크', nameSearch: '함박스테이크 hamburger steak', cal: 450, serving: '1인분', carbs: 22, protein: 32, fat: 24, gi: 'medium', category: 'meat' },
  { id: 'ws06', name: '나폴리탄 (토마토 파스타)', nameSearch: '나폴리탄 토마토파스타 tomato pasta', cal: 540, serving: '1인분', carbs: 78, protein: 16, fat: 16, gi: 'medium', category: 'noodle' },
  { id: 'ws07', name: '크림파스타', nameSearch: '크림파스타 cream pasta', cal: 680, serving: '1인분', carbs: 72, protein: 18, fat: 32, gi: 'high', category: 'noodle' },
  { id: 'ws08', name: '부리또', nameSearch: '부리또 burrito', cal: 520, serving: '1개', carbs: 60, protein: 24, fat: 18, gi: 'high', category: 'fastfood' },
  { id: 'ws09', name: '타코', nameSearch: '타코 taco', cal: 210, serving: '1개', carbs: 24, protein: 12, fat: 8, gi: 'medium', category: 'fastfood' },
  { id: 'ws10', name: '샐러드 (그린볼)', nameSearch: '샐러드 그린볼 green salad bowl', cal: 180, serving: '1개', carbs: 14, protein: 12, fat: 8, gi: 'low', category: 'vegetable' },
];

// ─── 검색 함수 ───

export function searchFoods(query: string, customFoods: FoodItem[] = []): FoodItem[] {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();
  const all = [...customFoods, ...KOREAN_FOODS];
  const scored = all.map(food => {
    let score = 0;
    if (food.name.startsWith(query)) score += 100;
    else if (food.name.includes(query)) score += 60;
    if (food.nameSearch.toLowerCase().includes(q)) score += 30;
    if (food.isCustom) score += 10; // 커스텀 음식 우선
    return { food, score };
  })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 15).map(x => x.food);
}

export function getFoodById(id: string, customFoods: FoodItem[] = []): FoodItem | undefined {
  return customFoods.find(f => f.id === id) ?? KOREAN_FOODS.find(f => f.id === id);
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
