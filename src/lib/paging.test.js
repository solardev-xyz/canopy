import { describe, expect, test } from "vitest";
import { nextTick, ref } from "vue";
import { usePagedList } from "./paging.js";

const names = (list) => list.map((item) => item.name);

function makeItems(n) {
  return Array.from({ length: n }, (_, i) => ({ name: `repo-${i}` }));
}

describe("usePagedList", () => {
  test("slices pages and navigates within bounds", () => {
    const list = usePagedList(makeItems(25), { pageSize: 10 });
    expect(list.total.value).toBe(25);
    expect(list.totalPages.value).toBe(3);
    expect(names(list.items.value)).toEqual(names(makeItems(10)));

    list.next();
    expect(list.page.value).toBe(1);
    list.next();
    list.next(); // past the end — clamped
    expect(list.page.value).toBe(2);
    expect(list.items.value).toHaveLength(5);

    list.prev();
    list.prev();
    list.prev(); // before the start — clamped
    expect(list.page.value).toBe(0);
  });

  test("filters via match and resets the page", async () => {
    const list = usePagedList(makeItems(30), {
      pageSize: 10,
      match: (item, q) => item.name.includes(q),
    });
    list.next();
    expect(list.page.value).toBe(1);

    list.query.value = "repo-2"; // repo-2, repo-20..29 → 11 items
    await nextTick();
    expect(list.page.value).toBe(0);
    expect(list.total.value).toBe(11);
    expect(list.totalPages.value).toBe(2);
  });

  test("tracks a reactive source and clamps the page when it shrinks", async () => {
    const source = ref(makeItems(21));
    const list = usePagedList(source, { pageSize: 10 });
    list.next();
    list.next();
    expect(list.page.value).toBe(2);

    source.value = makeItems(5);
    await nextTick();
    expect(list.page.value).toBe(0);
    expect(list.items.value).toHaveLength(5);
  });

  test("empty list yields one empty page", () => {
    const list = usePagedList([], { pageSize: 10 });
    expect(list.total.value).toBe(0);
    expect(list.totalPages.value).toBe(1);
    expect(list.items.value).toEqual([]);
  });

  test("needed only when the source outgrows a page or a query is active", () => {
    const short = usePagedList(makeItems(3), { pageSize: 10 });
    expect(short.needed.value).toBe(false);
    short.query.value = "x";
    expect(short.needed.value).toBe(true);

    const long = usePagedList(makeItems(11), { pageSize: 10 });
    expect(long.needed.value).toBe(true);
  });
});
