import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {PageParameter} from 'model/page-parameter';
import {PrintDocument} from 'model/print-document';
import {papers} from 'model/papers';
import { PaginationOptions } from 'model/pagination-options';

async function html2pdf(printDocument: PrintDocument, fileName: string): Promise<void> {
  const paperName = printDocument.printOptions.paperSize ?? 'a4';
  const orientation =
    printDocument.printOptions.orientation === 'landscape' || printDocument.printOptions.orientation === 'l'
      ? 'landscape'
      : 'portrait';
  let jsPdf = new jsPDF({
    orientation: orientation,
    unit: 'px', //Measurement unit (base unit) to be used when coordinates are specified.Possible values are "pt" (points), "mm", "cm", "in", "px", "pc", "em" or "ex".
    format: paperName, //Default is "a4". If you want to use your own format just pass instead of one of the above predefined formats the size as an number-array, e.g. [595.28, 841.89]
    hotfixes: ['px_scaling'] // Note that in order to get the correct scaling for "px" units, you need to enable the hotfix "px_scaling" by setting options.hotfixes = ["px_scaling"].
  });
  const htmlBody = printDocument.content.element;
  const htmlHeader = printDocument.header.element;
  if(printDocument.header.height)
  {    
    htmlHeader.style.height = printDocument.header.height + 'px';
  }
  const htmlFooter = printDocument.footer.element;  
  if(printDocument.header.height)
  {    
    htmlFooter.style.height = printDocument.footer.height + 'px';
  }
  const bodyInnerHTML = htmlBody.innerHTML;
  //a4纸的尺寸pt:[595.28,841.89], px:794px*1123px
  // var pageWidth = 841.89;
  // var pageHeight = 595.28;
  // 注意: 计算位置必须取整数, 不然计算表格时算法会出现下一行的开始位置小于上一行的结束位置, 造成算法错乱.
  const paperSize = papers[paperName];
  let pageWidth =
    printDocument.printOptions.orientation === 'portrait' || printDocument.printOptions.orientation === 'p'
      ? paperSize.width
      : paperSize.height;
  let pageHeight =
    printDocument.printOptions.orientation === 'portrait' || printDocument.printOptions.orientation === 'p'
      ? paperSize.height
      : paperSize.width;
  let offsetWidth = 2; //截图时去除容器的外层边框, 否则会把容器的外层边线也复制到PDF中.

  const scale = 3;
  // html2canvas配置项
  const options = {
    allowTaint: true,
    useCORS: true, // 是否尝试使用CORS从服务器加载图像
    async: false, // 是否异步解析和呈现元素
    scale: scale, // 处理模糊问题, 低于3截图会模糊
    dpi: 300, // 处理模糊问题
    background: '#ffffff' // 一定要添加背景颜色，否则出来的图片，背景全部都是透明的
    // width: contentWidth, // canvas宽度
    // height: contentHeight
  };

  const margin = printDocument.printOptions.margin;
  htmlHeader.style.marginLeft  = margin.left + 'px';
  htmlHeader.style.marginRight  = margin.right + 'px';
  htmlBody.style.marginLeft  = margin.left + 'px';
  htmlBody.style.marginRight  = margin.right + 'px';
  htmlFooter.style.marginLeft  = margin.left + 'px';
  htmlFooter.style.marginRight  = margin.right + 'px';

  let contentHeight = htmlBody.offsetHeight;
  // let contentWidth = htmlBody.offsetWidth;

  // let headerContentWidth = htmlHeader.offsetWidth;
  let headerHeight = Number(htmlHeader.offsetHeight);
  // let headerRect = getElementRect(window, document, htmlHeader);
  // let headerTopOffset = headerRect.top;
  // let headerZoomRatio = 1;
  let headerWidth = pageWidth - margin.left - margin.right;
  let headerPageImageData;
  let headerCanvas = await getElementCanvas(htmlHeader, options);

  // let headerCanvasContainer = document.getElementById('canvas-header');
  // headerCanvasContainer?.appendChild(headerCanvas);

  let headerContext = headerCanvas.getContext('2d', {
    willReadFrequently: true
  });

  // headerZoomRatio = headerCanvas.height / scale / headerHeight;
  headerPageImageData = headerContext.getImageData(0, 0, (headerWidth - offsetWidth) * scale, headerHeight * scale);
  jsPdf.addImage(
    headerPageImageData,
    'JPEG',
    margin.left,
    margin.top,
    headerWidth - offsetWidth,
    headerHeight,
    'header',
    'FAST'
  ); //alias参数: 给别名header, 可以重用页眉图片.

  let footerWidth = pageWidth - margin.left - margin.right;
  let footerHeight = Number(htmlFooter.offsetHeight);

  const footerCanvas = await getElementCanvas(htmlFooter, options);

  // let footerCanvasContainer = document.getElementById('canvas-footer');
  // footerCanvasContainer?.appendChild(footerCanvas);

  // let footerContentWidth = htmlFooter.offsetWidth;
  // let footerContentHeight = htmlFooter.offsetHeight;
  // let footerRect = getElementRect(window, document, htmlFooter);
  // let footerTopOffset = headerRect.top;
  // let footerZoomRatio = 1;
  let footerPageImageData;
  let footerContext = footerCanvas.getContext('2d', {
    willReadFrequently: true
  });
  // footerZoomRatio = footerCanvas.height / scale / footerHeight;
  footerPageImageData = footerContext.getImageData(0, 0, (footerWidth - offsetWidth) * scale, footerHeight * scale);

  let footerText = printDocument.footer.text;
  let pageNumberHeight = 0;
  let pageNumberY = pageHeight - margin.bottom;
  if (footerText && printDocument.footer.text.newLine) {
    var pageNumberOptions = {
      font: footerText.fontFamily,
      fontSize: footerText.fontSize,
      maxWidth: footerWidth,
      scaleFactor: jsPdf.internal.scaleFactor
    };
    var dimensions = jsPdf.getTextDimensions(printDocument.footer.text.rightText, pageNumberOptions);

    //默认页码上下间距
    const defaultLineSpacing = 5;
    let marginTop = 0;
    if (printDocument.footer?.text?.margin?.top) {
      marginTop = printDocument.footer?.text?.margin?.top;
    } else {
      marginTop = defaultLineSpacing;
    }

    let marginBottom = 0;
    if (printDocument.footer?.text?.margin?.bottom) {
      marginBottom = printDocument.footer?.text?.margin?.bottom;
    } else {
      marginBottom = defaultLineSpacing;
    }

    pageNumberHeight = Number(dimensions.h.toFixed(0)) + marginTop + marginBottom;
    pageNumberY = pageHeight - margin.bottom - Number(dimensions.h.toFixed(0)) - marginTop;
  }

  let bodyMarginTop = margin.top + headerHeight;
  let bodyMarginBottom = margin.bottom + footerHeight;
  // let imgWidth = pageWidth - margin.left - margin.right;
  let imgHeight = pageHeight - bodyMarginTop - bodyMarginBottom - pageNumberHeight;

  const bodyCanvas = await getElementCanvas(htmlBody, options);

  // let bodyCanvasContainer = document.getElementById('canvas-body');
  // bodyCanvasContainer?.appendChild(bodyCanvas);

  // 返回图片的二进制数据
  // let bodyImageData = bodyCanvas.toDataURL("image/png");
  // downloadDataURL(bodyImageData, fileName + ".png");

  // let pageIndex = 0;
  // let pageStartPosition = 0;
  // let pageEndPosition = 0;

  let context = bodyCanvas.getContext('2d', {
    willReadFrequently: true
  });

  //计算Canvas与图片html高度缩放比率.
  let bodyRect = getElementRect(htmlBody);
  let bodyTopOffset = bodyRect.top;
  let zoomRatio = Number((bodyCanvas.height / scale / contentHeight).toFixed(0));

  let sourceX = 0;
  let sourceWidth = pageWidth - margin.left - margin.right;
  let currentPageIndex = 1;
  let currentPageStartPosition = 0;
  let currentPageEndPosition = getPageElements(
    htmlBody,
    contentHeight,
    zoomRatio,
    bodyTopOffset,
    imgHeight,
    currentPageIndex,
    currentPageStartPosition
  );

  console.log("Page",currentPageIndex,currentPageEndPosition);
  while (
    currentPageEndPosition.endPosition <= contentHeight &&
    currentPageEndPosition.endPosition >= 0 &&
    currentPageEndPosition.endPosition - currentPageStartPosition > 2 //剩余高度小于2个像素, 忽略最后一页.
  ) {
    let currentPageHeight = currentPageEndPosition.endPosition - currentPageStartPosition;
    //当表格被拆分时, 新页的第一行表格线变窄, 因此向前偏移1个像素(应该按照表格线宽度向上偏移).
    let pageOffsetX = currentPageIndex === 1 ? 0 : 1;
    let currentPageImageData = context.getImageData(
      sourceX * scale,
      (currentPageStartPosition - pageOffsetX) * scale,
      (sourceWidth - offsetWidth) * scale,
      (currentPageHeight + pageOffsetX) * scale
    );

    if (currentPageIndex === -1) {
      downloadImageData(currentPageImageData, fileName + '.png');
      downloadImageData(footerPageImageData, fileName + '_footer.png');
    }

    if (currentPageIndex > 1) {
      jsPdf.addPage();
    }

    //添加页眉
    jsPdf.addImage(headerPageImageData, 'JPEG', margin.left, 36, headerWidth - 2, headerHeight, 'header', 'FAST');

    //添加Table header.
    let peagedTableHeaderOffsetX = 0;
    if (currentPageEndPosition.peagedTable) {
      const peagedTableHeader = getTableHeader(currentPageEndPosition.peagedTable);
      if (peagedTableHeader && window.getComputedStyle(peagedTableHeader).display === 'table-header-group') {
        const peagedTableRect = getElementRect(peagedTableHeader);

        //当被拆分的表格的表头位置小于当前页开始位置时(不是表格被拆分的第一页), 添加表头.
        if (peagedTableRect.top < currentPageStartPosition) {
          peagedTableHeaderOffsetX = peagedTableRect.height;
          const peagedTableHeaderX = Number(((peagedTableRect.top - bodyTopOffset) * zoomRatio).toFixed(0));
          let peagedTableImageData = context.getImageData(
            sourceX * scale,
            peagedTableHeaderX * scale,
            (sourceWidth - offsetWidth) * scale,
            peagedTableRect.height * scale
          );

          jsPdf.addImage(
            peagedTableImageData,
            'JPEG',
            margin.left,
            bodyMarginTop,
            sourceWidth,
            peagedTableRect.height + pageOffsetX,
            undefined,
            'FAST'
          );
        }
      }
    }

    //添加页面
    jsPdf.addImage(
      currentPageImageData,
      'JPEG',
      margin.left,
      bodyMarginTop + peagedTableHeaderOffsetX,
      sourceWidth,
      currentPageHeight + pageOffsetX,
      undefined,
      'FAST'
    );

    //添加页脚
    jsPdf.addImage(
      footerPageImageData,
      'JPEG',
      margin.left,
      pageHeight - margin.bottom - pageNumberHeight - footerHeight,
      footerWidth - 2,
      footerHeight,
      'footer',
      'FAST'
    ); //alias参数: 给别名footer, 可以重用页脚图片.

    // jsPdf.addImage(footerPageImageData, "JPEG", margin.left, pageHeight - footerContentHeight - margin.bottom, (
    //   footerWidth - 2), footerContentHeight, 'footer', 'FAST');

    //设置透明度
    jsPdf.setGState(
      jsPdf.GState({
        opacity: 0.4
      })
    );
    //设置字体颜色
    jsPdf.setTextColor('#8E8E8E');
    //设置字体大小
    jsPdf.setFontSize(72);
    //添加水印文字
    jsPdf.text('Watermark', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 0
    });
    //恢复设置透明度
    jsPdf.setGState(
      jsPdf.GState({
        opacity: 1
      })
    );

    let tableHeaderOffset = 0;
    if (currentPageEndPosition.peagedTable) {
      const peagedTableHeader = getTableHeader(currentPageEndPosition.peagedTable);
      if (peagedTableHeader && window.getComputedStyle(peagedTableHeader).display === 'table-header-group') {
        const peagedTableRect = getElementRect(peagedTableHeader);
        tableHeaderOffset = peagedTableRect.height;
      }
    }

    currentPageImageData = null;
    currentPageIndex++;
    currentPageStartPosition = currentPageEndPosition.endPosition;
    currentPageEndPosition = getPageElements(
      htmlBody,
      contentHeight,
      zoomRatio,
      bodyTopOffset,
      imgHeight - tableHeaderOffset,
      currentPageIndex,
      currentPageStartPosition
    );
    console.log('Page', currentPageIndex, currentPageEndPosition);
  }

  let pageCount = currentPageIndex - 1;

  //设置字体颜色
  jsPdf.setTextColor('#000000');
  //设置字体大小
  let pageNumberFontSize = 9;
  jsPdf.setFontSize(pageNumberFontSize);
  for (let i = 1; i <= pageCount; i++) {
    const pageParameters: PageParameter = {
      pageNumber: i,
      pageCount: pageCount
    };
    const pageText = 'Page {{pageNumber}} of {{pageCount}}';
    let newPageText = pageText.replace(/\{\{(\w+)\}\}/g, (match, p1: string) => {
      return pageParameters[p1] || match;
    });
    jsPdf.setPage(i);
    //添加页码
    let textWidth = (jsPdf.getStringUnitWidth(newPageText) * pageNumberFontSize) / jsPdf.internal.scaleFactor;
    let pageNumberX = pageWidth - margin.right - textWidth - 5;
    jsPdf.text(newPageText, pageNumberX, pageNumberY);
  }
  //还原对body的InnerHTML的修改, 超大元素分页是缓存了分页位置信息.
  htmlBody.innerHTML = bodyInnerHTML;

  //保存pdf.
  jsPdf.save(fileName);
}

export default html2pdf;

function getElementCanvas(canvasElement: any, canvasOptions: any): Promise<any> {
  return new Promise((resolve, reject) => {
    html2canvas(canvasElement, canvasOptions)
      .then((canvas: any) => {
        resolve(canvas);
      })
      .catch((error: any) => {
        reject(error);
      });
  });
}

function getPageElements(
  element: any,
  contentHeight: number,
  zoomRatio: number,
  bodyTopOffset: number,
  imgHeight: number,
  pageIndex: number,
  pageStartPosition: number
): PaginationOptions {
  let maxPagePosition = pageStartPosition + imgHeight;
  var paginationOptions: PaginationOptions = {
    endPosition: maxPagePosition
  };
  if (pageStartPosition >= contentHeight) {
    //超过页面底部.
    paginationOptions.endPosition = -1;
    return paginationOptions;
  }

  let child = element.firstElementChild;
  while (child) {
    let elementRect = getElementRect(child);
    let elementX = Number(((elementRect.top - bodyTopOffset) * zoomRatio).toFixed(0));
    // let elementHeight = Number((elementRect.height * zoomRatio).toFixed(0));
    let elementEndPosition = Number(((elementRect.top + elementRect.height - bodyTopOffset) * zoomRatio).toFixed(0));
    //如果元素是TABLE, 则需要判断当前页是否包含该表格.
    if (child.tagName === 'TD' || child.tagName === 'TH') {
      //TD和TH不需要处理, 只需要按照父元素TR进行分页.
    } else {
      //其他类型的元素.
      if (elementEndPosition <= pageStartPosition) {
        //元素结束位置小于当前页开始位置, 说明元素不在页内, 不用拆分元素.
        console.log(
          '元素',
          child,
          '位置小于第',
          pageIndex,
          '页的开始位置.',
          ' Element start position:',
          elementX,
          'Element end position:',
          elementEndPosition,
          'Page start position:',
          pageStartPosition,
          'Page end position:',
          maxPagePosition
        );
      } else if (elementX >= pageStartPosition && elementEndPosition < maxPagePosition) {
        //元素完全在页内, 不用拆分元素
        console.log(
          '元素',
          child,
          '完全在第',
          pageIndex,
          '页内.',
          ' Element start position:',
          elementX,
          'Element end position:',
          elementEndPosition,
          'Page start position:',
          pageStartPosition,
          'Page end position:',
          maxPagePosition
        );
      } else if (elementX > maxPagePosition) {
        //元素开始位置大于当前页结束位置, 说明元素不在页内, 不用拆分元素.
        console.log(
          '元素',
          child,
          '开始位置大于第',
          pageIndex,
          '页的结束位置.',
          ' Element start position:',
          elementX,
          'Element end position:',
          elementEndPosition,
          'Page start position:',
          pageStartPosition,
          'Page end position:',
          maxPagePosition
        );
      } else {
        //元素跨页了, 需要处理分页
        console.log(
          '元素',
          child,
          '跨越第',
          pageIndex,
          '页.',
          ' Element start position:',
          elementX,
          'Element end position:',
          elementEndPosition,
          'Page start position:',
          pageStartPosition,
          'Page end position:',
          maxPagePosition
        );
        if(child.tagName === 'TABLE' )
        {
          //表格跨页, 记录跨页的表格
          if(!paginationOptions.peagedTable)
          {
            paginationOptions.peagedTable = child;
          }
        }
        if (child.tagName != 'TR' && child.firstElementChild) {
          //如果元素不是TR, 并且元素包含子元素, 则遍历子元素, 根据子元素分页.
          let childPaginationOptions = getPageElements(
            child,
            contentHeight,
            zoomRatio,
            bodyTopOffset,
            imgHeight,
            pageIndex,
            pageStartPosition
          );
          paginationOptions.endPosition = childPaginationOptions.endPosition;
          if(!paginationOptions.peagedTable && childPaginationOptions.peagedTable)
          {
            paginationOptions.peagedTable = childPaginationOptions.peagedTable;
          }
        } else {
          //如果是TR(TODO: 目前不支持TR超过一页, 需要解决TR超过一页的问题)或者是没有子元素.
          console.log(
            '元素',
            child,
            '跨越第',
            pageIndex,
            '页.',
            ' Element start position:',
            elementX,
            'Element end position:',
            elementEndPosition,
            'Page start position:',
            pageStartPosition,
            'Page end position:',
            maxPagePosition
          );
          if (child.tagName === 'THEAD') {
            if (elementX < paginationOptions.endPosition) {
              paginationOptions.endPosition = elementX;
            }
          } else if (child.tagName === 'TR') {
            //TODO, 如果是第一行, 则需要把表头一起换页.
            if (elementX < paginationOptions.endPosition) {
              paginationOptions.endPosition = elementX;
            }
          } else {
            //其他类型的元素.
            if (child.firstElementChild) {
              //如果有子元素, 递归处理子元素
              let childPageEndPosition = getPageElements(
                child,
                contentHeight,
                zoomRatio,
                bodyTopOffset,
                imgHeight,
                pageIndex,
                pageStartPosition
              );
              if (childPageEndPosition.endPosition < paginationOptions.endPosition) {
                paginationOptions.endPosition = childPageEndPosition.endPosition;
              }
            } else {
              //如果是其他dev等元素中的文本跨页, 则按照文本行数分页.
              let childPageEndPosition = getPageElementPosition(
                child,
                elementX,
                imgHeight,
                pageIndex,
                pageStartPosition
              );
              if (childPageEndPosition.endPosition < paginationOptions.endPosition) {
                paginationOptions.endPosition = childPageEndPosition.endPosition;
              }
            }
          }
        }
      }
    }
    child = child.nextElementSibling;
  }
  if (paginationOptions.endPosition > contentHeight) {
    paginationOptions.endPosition = contentHeight;
  }
  return paginationOptions;
}

function getPageElementPosition(
  element: any,
  elementX: number,
  imgHeight: number,
  pageIndex: number,
  pageStartPosition: number
): PaginationOptions {
  var paginationOptions: PaginationOptions = {
    endPosition: 0
  };
  let pageCurrentIndex = 0;
  if (element.getAttribute('page-index')) {
    pageCurrentIndex = parseInt(element.getAttribute('page-index'));
  }
  let elementPageEndPosition = 0;
  if (element.getAttribute('page-end-position')) {
    elementPageEndPosition = parseInt(element.getAttribute('page-end-position'));
  }

  let leftHeight = pageStartPosition + imgHeight - elementX;
  if (pageCurrentIndex > 1) {
    //该元素已经被拆分过了, 新页剩余空间为整页的高度
    leftHeight = imgHeight;
  }

  let lineHeight = Number(window.getComputedStyle(element).lineHeight.replace('px', ''));

  //计算剩余空间可以打印几行
  let elementLineCount = Math.floor(leftHeight / lineHeight);
  if (elementLineCount <= 1 && pageCurrentIndex == 0) {
    //剩余高度不够一行, 并且是该元素还未被分页, 则直接从该元素开始分页
    paginationOptions.endPosition = elementX;
    return paginationOptions;
  }
  let elementPageHeight = Number((elementLineCount * lineHeight).toFixed(0));
  //如果是第一页, 则结束位置为元素的开始位置加页高.
  elementPageEndPosition =
    elementPageEndPosition === 0 ? elementX + elementPageHeight : elementPageEndPosition + elementPageHeight;
  element.setAttribute('page-end-position', elementPageEndPosition.toString());
  element.setAttribute('page-index', pageIndex.toString());
  paginationOptions.endPosition = elementPageEndPosition;
  return paginationOptions;
}

//以一个对象的x和y属性放回滚动条的位置
function getScrollOffsets() {
  //除了IE 8以及更早的版本以外，其他浏览器都支持
  if (window.pageXOffset != null)
    return {
      x: Number(window.pageXOffset.toFixed(0)),
      y: Number(window.pageYOffset.toFixed(0))
    };
  //对标准模式下的IE
  let doc = window.document;
  if (document.compatMode == 'CSS1Compat')
    return {
      x: Number(doc.documentElement.scrollLeft.toFixed(0)),
      y: Number(doc.documentElement.scrollTop.toFixed(0))
    };
  //对混杂模式下的浏览器
  return {
    x: Number(doc.body.scrollLeft.toFixed(0)),
    y: Number(doc.body.scrollTop.toFixed(0))
  };
}

//元素相对于文档的坐标位置
function getElementRect(element: any) {
  let box = element.getBoundingClientRect();
  let offsets = getScrollOffsets();
  let x = box.left + offsets.x;
  let y = box.top + offsets.y;

  return {
    left: Number(x.toFixed(0)),
    top: Number(y.toFixed(0)),
    width: Number(box.width.toFixed(0)),
    height: Number(box.height.toFixed(0))
  };
}

function dataURLtoBlob(dataurl: any) {
  let arr = dataurl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {
    type: mime
  });
}

function getTableHeader(elementTable: HTMLElement): HTMLElement | undefined {
  let child = elementTable.firstElementChild;
  while (child) {
      if (child.tagName === 'THEAD') {
          return child as HTMLElement;
      }
  }
  return undefined;
}

function downloadDataURL(imgData: any, fileName: string) {
  let blob = dataURLtoBlob(imgData);
  let objurl = URL.createObjectURL(blob);
  let link = document.createElement('a');
  link.download = fileName;
  link.href = objurl;
  link.click();
}

function downloadImageData(imageData: any, fileName: string) {
  let cvs = document.createElement('canvas');
  let ctx = cvs.getContext('2d');
  cvs.width = imageData.width;
  cvs.height = imageData.height;
  ctx?.putImageData(imageData, 0, 0);
  let imgData = cvs.toDataURL('image/png');
  downloadDataURL(imgData, fileName);
}
