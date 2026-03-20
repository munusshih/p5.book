// title: cover & back story
// description: isFirstPage(), isLastPage(), and page-aware interior storytelling
//
// A worksheet-friendly example for section D.
//
// Pattern:
//   - Cover on first page
//   - Back cover on last page
//   - Interior pages respond to pageNumber / progress

let book;

function setup() {
  book = createBook(4, 6, 10);
  book.setDPI(150);
  colorMode(HSB, 360, 100, 100, 1);
  textAlign(CENTER, CENTER);
}

function draw() {
  if (book.isFirstPage()) {
    background(32, 80, 100);
    fill(0, 0, 12);
    textSize(46);
    text("MY BOOK", width / 2, height * 0.46);
    textSize(15);
    text("by you", width / 2, height * 0.62);
  } else if (book.isLastPage()) {
    background(0, 0, 12);
    fill(0, 0, 98);
    textSize(20);
    text("THE END", width / 2, height * 0.5);
  } else {
    let chapter = book.pageNumber - 1;
    let hue = map(chapter, 1, book.totalPages - 2, 40, 300);

    background(hue, 35, 98);
    fill(0, 0, 12);
    textSize(92);
    text(chapter, width / 2, height * 0.52);

    textSize(15);
    text("chapter " + chapter, width / 2, height * 0.18);
  }

  book.addPage();
}
