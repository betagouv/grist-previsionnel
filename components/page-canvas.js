import { useEffect, useRef, useState } from "react";

import Konva from "konva";
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
  const konvaRef = useRef(null);

  const [stage, setStage] = useState();
  const [image, setImage] = useState();
  const [submitted, setSubmitted] = useState(false);

  const paddingOffset = { x: 20, y: 20 };

  function builderC(x, y) {
    var shape = new Konva.Circle({
      x,
      y,
      radius: 70,
      fill: "red",
      stroke: "black",
      strokeWidth: 4,
      draggable: true,
    });
    return [shape];
  }

  function builderT(x, y) {
    var shape = new Konva.Text({
      x,
      y,
      text: "Simple Text",
      fill: "red",
      draggable: true,
    });
    shape.offsetX(shape.width() / 2);
    shape.offsetY(shape.height());
    return [shape];
  }

  async function builder(x, y) {
    const raw = localStorage.getItem("signature");
    const r = await fetch(raw);

    return new Promise((resolve, reject) => {
      const shape = Konva.Image.fromURL(
        raw,
        (image) => {
          image.x(x);
          image.y(y);
          image.draggable(true);

          image.offsetX(image.width() / 2);
          image.offsetY(image.height());
          resolve([image]);
        },
        reject,
      );
    });
  }
  useEffect(() => {
    console.log({ stage, pn: props.pageNumber });
  }, [stage, props.pageNumber]);

  function setListener(stage) {
    stage.off(".ext");
    if (!submitted) {
      stage.on("pointermove.ext", (e) => {
        props?.onMouseMove({
          x: e.evt.layerX - image.width() / 2,
          y: e.evt.layerY - image.height(),
        });
      });
      stage.on("pointerup.ext", (e) => {
        props?.onClick({
          x: e.evt.layerX - image.width() / 2,
          y: e.evt.layerY - image.height(),
        });
      });
    }
  }
  useEffect(() => {
    if (!stage) {
      return;
    }
    setListener(stage);
  }, [props?.onMouseMove, props?.onClick, stage]);

  useEffect(() => {
    if (
      !canvasRef.current ||
      !konvaRef.current ||
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
      if (stage) {
        return;
      }

      var newStage = new Konva.Stage({
        container: `page-${props.pageNumber}`, // id of container <div>
        width: canvas.width,
        height: canvas.height,
      });

      newStage.opacity(0.5);
      newStage.alpha(0.5);
      konvaRef.current.style = `left:-${(canvas.width + paddingOffset.x * 2) / 1}px`;

      // then create layer
      var savingLayer = new Konva.Layer();
      var temporyLayer = new Konva.Layer();
      newStage.add(savingLayer);
      newStage.add(temporyLayer);

      var shapes = await builder(newStage.width() / 2, newStage.height() / 2);
      setImage(shapes[0]);
      shapes.forEach((shape) => {
        shape.opacity(0.5);
        shape.alpha(0.5);
        temporyLayer.add(shape);
      });

      newStage.on("pointermove", (e) => {
        shapes.forEach((shape) => {
          shape.x(e.evt.layerX);
          shape.y(e.evt.layerY);
        });
      });

      newStage.on("pointerup", async (e) => {
        var savedShapes = await builder(e.evt.layerX, e.evt.layerY);
        savingLayer.add(savedShapes[0]);
        shapes.forEach((shape) => {
          temporyLayer.remove(shape);
        });

        newStage.off("pointerup");
        newStage.off("pointermove");
        setSubmitted(true);
      });

      setListener(newStage);
      setStage(newStage);

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

  return (
    <div className="page">
      <canvas className="page" ref={canvasRef}></canvas>
      <div
        ref={konvaRef}
        className="konva-container"
        id={`page-${props.pageNumber}`}
      ></div>
    </div>
  );
}

export default PageCanvas;
