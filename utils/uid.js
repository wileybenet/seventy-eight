function rand() {
  return (Math.random() * 1000000).toFixed(0);
}

export default function uid() {
  return `${rand()}-${rand()}-${rand()}`;
}
