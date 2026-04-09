import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

function SkeletonBox({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.box, style, { opacity }]} />;
}

export function PageRowSkeleton() {
  return (
    <View style={styles.pageRow}>
      <View style={styles.pageRowLeft}>
        <SkeletonBox style={styles.titleBar} />
        <SkeletonBox style={styles.subtitleBar} />
      </View>
      <SkeletonBox style={styles.chevron} />
    </View>
  );
}

export function PageListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <PageRowSkeleton key={i} />
      ))}
    </View>
  );
}

export function ImageGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <View style={styles.imageGrid}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBox key={i} style={styles.imageCard} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
  },
  pageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  pageRowLeft: {
    flex: 1,
    gap: 6,
  },
  titleBar: {
    height: 16,
    width: "60%",
    borderRadius: 4,
  },
  subtitleBar: {
    height: 12,
    width: "35%",
    borderRadius: 4,
  },
  chevron: {
    height: 20,
    width: 20,
    borderRadius: 10,
    marginLeft: 12,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
    padding: 1,
  },
  imageCard: {
    width: "32.8%",
    aspectRatio: 1,
    borderRadius: 4,
  },
});
