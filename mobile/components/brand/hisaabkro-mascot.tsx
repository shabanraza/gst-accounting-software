import { useEffect, useRef } from 'react'
import { Animated, Easing, Pressable } from 'react-native'

const mascotSource = require('@/assets/brand/hisaabkro-mascot.png')

export function HisaabKroMascot() {
  const float = useRef(new Animated.Value(0)).current
  const press = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    )

    loop.start()
    return () => loop.stop()
  }, [float])

  function handlePress() {
    Animated.sequence([
      Animated.spring(press, {
        toValue: 1.05,
        friction: 4,
        tension: 160,
        useNativeDriver: true,
      }),
      Animated.spring(press, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  })

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="HisaabKro helper"
      onPress={handlePress}
    >
      <Animated.Image
        source={mascotSource}
        resizeMode="contain"
        style={{
          height: 148,
          width: 148,
          transform: [{ translateY }, { scale: press }],
        }}
      />
    </Pressable>
  )
}
