import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scale?: number; // default 0.93
  activeOpacity?: number; // default 0.85
}

export default function PressableScale({ onPress, onLongPress, disabled, style, children, scale = 0.93, activeOpacity = 0.85 }: Props) {
  const anim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(anim, { toValue: scale, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  const onPressOut = () => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  };

  // 부모 기준 배치 속성(flex·margin·alignSelf)은 Pressable에, 내용 스타일
  // (flexDirection·padding·배경 등)은 자식을 직접 감싸는 Animated.View에 분리한다.
  // 전부 Pressable에 걸면 flexDirection이 자식에 미치지 않아 가로 배치가 깨지고,
  // 전부 안쪽에 걸면 flex: 1 버튼이 부모 row 안에서 늘어나지 않는다.
  const flat = StyleSheet.flatten(style) ?? {};
  const {
    flex, flexGrow, flexShrink, flexBasis, alignSelf,
    margin, marginTop, marginBottom, marginLeft, marginRight,
    marginHorizontal, marginVertical, marginStart, marginEnd,
    ...innerStyle
  } = flat as ViewStyle;
  const outerStyle: ViewStyle = {
    flex, flexGrow, flexShrink, flexBasis, alignSelf,
    margin, marginTop, marginBottom, marginLeft, marginRight,
    marginHorizontal, marginVertical, marginStart, marginEnd,
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      style={outerStyle}
    >
      <Animated.View style={[innerStyle, { flex: flex !== undefined ? 1 : undefined, transform: [{ scale: anim }], opacity: disabled ? 0.5 : 1 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
