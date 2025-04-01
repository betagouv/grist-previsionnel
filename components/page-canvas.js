import { useEffect, useRef, useState } from "react";

import * as pdfjsLibLatest from "pdfjs-dist";
import * as pdfjsLibLegacy from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLibLatest.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
pdfjsLibLegacy.GlobalWorkerOptions.workerSrc = "pdf.worker.legacy.mjs";

function PageCanvas(props) {
  const useLegacy = !!navigator.userAgent.match("Firefox/115");
  const pdfjsLib = useLegacy ? pdfjsLibLegacy : pdfjsLibLatest;
  pdfjsLib.GlobalWorkerOptions.workerSrc = useLegacy
    ? "pdf.worker.legacy.mjs"
    : "pdf.worker.mjs";

  const canvasRef = useRef(null);

  const paddingOffset = { x: 20, y: 20 };

  useEffect(() => {
    if (
      !canvasRef.current ||
      !props.document ||
      props.pageNumber === undefined
    ) {
      return;
    }
    async function render() {
      const page = await props.document.getPage(props.pageNumber + 1);
      var scale = 1;
      var viewport = page.getViewport({ scale: scale });

      var canvas = canvasRef.current;
      var canvasContext = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      var renderContext = {
        canvasContext,
        viewport,
      };
      var renderTask = page.render(renderContext);
      renderTask.promise.then(
        function () {},
        function () {},
      );
      return renderTask;
    }
    const promise = render();
    return () => {
      promise.then((task) => task.cancel());
    };
  }, [canvasRef, props.document, props.pageNumber]);

  function onClick(e) {
    props?.onClick?.({
      x: e.nativeEvent.offsetX - paddingOffset.x,
      y: e.nativeEvent.offsetY - paddingOffset.y,
    });
  }

  function onMouseMove(e) {
    props?.onMouseMove?.({
      x: e.nativeEvent.offsetX - paddingOffset.x,
      y: e.nativeEvent.offsetY - paddingOffset.y,
    });
  }

  return (
    <div>
      <canvas
        onClick={onClick}
        onMouseMove={onMouseMove}
        onMouseOut={() => props?.onMouseOut?.()}
        className="page"
        ref={canvasRef}
      ></canvas>
    </div>
  );
}

export default PageCanvas;
