import { useEffect, useState } from 'react';
import { api } from './api';
import './styles/select_grid.css';
import { alert } from './dialog';

// 분류 트리. 불러오는 중에는 null
export function useCategoryTree() {
  const [tree, setTree] = useState(null);
  useEffect(() => {
    api('/categories').then(setTree, (e) => { alert(`단원 목록을 불러오지 못했습니다.\n(${e.message})`); setTree([]); });
  }, []);
  return tree;
}

export const flat = (nodes) => nodes.flatMap((c) => [c, ...flat(c.children)]);

// key: 분류 id(숫자) 또는 이름 경로(['키오스크', '병원'])
export function findCategory(tree, key) {
  if (!Array.isArray(key)) return flat(tree).find((c) => c.id === key) ?? null;
  let node = null;
  for (const name of key) {
    node = (node ? node.children : tree).find((c) => c.name === name);
    if (!node) return null;
  }
  return node;
}

// 단원 선택 화면 카드의 설명 칸(22px 글자 2줄)에 들어가는 길이.
// 모든 선택 화면에서 2줄에 34자 이상 들어가는 것을 확인, 글꼴 차이를 감안해 30자. 서버 routes/categories.js 의 UNIT_DESC_MAX 와 같은 값
export const UNIT_DESC_MAX = 30;

// 설명 줄바꿈(\n)을 그대로 보여주기
export const descStyle = { whiteSpace: 'pre-line' };
