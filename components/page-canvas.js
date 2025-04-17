"use client";
import { useEffect, useRef, useState } from "react";

import Konva from "konva";
import * as pdfjsLibLatest from "pdfjs-dist";
import * as pdfjsLibLegacy from "pdfjs-dist/legacy/build/pdf.mjs";

import { Stage, Layer, Rect, Circle, Text, Image } from "react-konva";
import additionTypes from "../lib/addition-types.js";

pdfjsLibLatest.GlobalWorkerOptions.workerSrc = "pdf.worker.mjs";
pdfjsLibLegacy.GlobalWorkerOptions.workerSrc = "pdf.worker.legacy.mjs";

function generateKey(a) {
  return [a.type, a.x, a.y, a.pageNumber].join(" ");
}
function PageCanvas(props) {
  const useLegacy = !!navigator.userAgent.match("Firefox/115");
  const pdfjsLib = useLegacy ? pdfjsLibLegacy : pdfjsLibLatest;
  pdfjsLib.GlobalWorkerOptions.workerSrc = useLegacy
    ? "pdf.worker.legacy.mjs"
    : "pdf.worker.mjs";

  const canvasRef = useRef(null);

  const [dims, setDims] = useState();
  const [stage, setStage] = useState();
  const [image, setImage] = useState();
  const [additionShapes, setAdditionShapes] = useState([]);

  const paddingOffset = { x: 20, y: 20 };
  const checkShift = 0;

  useEffect(() => {
    if (!props.config) {
      return;
    }
    if (!props.additions?.length) {
      setAdditionShapes([]);
    }
    const shapes = props.additions.map((a) => {
      if (a.type == "signature") {
        const raw = localStorage.getItem("signature");
        const img = document.createElement("img");
        img.src = raw;
        const s = (
          <Image
            image={img}
            scale={{ x: 0.5, y: 0.5 }}
            key={generateKey(a)}
            x={a.x + checkShift}
            y={a.y + checkShift}
          />
        );
        return s;
      } else {
        const meta = additionTypes[a.type];
        return (
          <Text
            key={generateKey(a)}
            x={a.x + checkShift}
            y={a.y + checkShift}
            fontFamily={"Times-Roman"}
            text={meta.text(props.config)}
            fontSize={15}
          />
        );
      }
    });
    setAdditionShapes(shapes);
  }, [props.additions, props.config]);

  function setListener(stage) {
    stage.off(".ext");
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
  useEffect(() => {
    if (!stage) {
      return;
    }
    setListener(stage);
  }, [props?.onMouseMove, props?.onClick, stage]);

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
      setDims({ height: viewport.height, width: viewport.width });
      /*
      var newStage = new Konva.Stage({
        container: `page-${props.pageNumber}`, // id of container <div>
        width: canvas.width,
        height: canvas.height,
      });

      newStage.opacity(0.5);
      newStage.alpha(0.5);
      `;

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
*/
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
    <>
      <div className="page">
        <canvas className="page-background" ref={canvasRef}></canvas>
        {dims ? (
          <Stage
            className="konva-container"
            height={dims.height}
            width={dims.width}
            opacity={0.5}
          >
            <Layer>{additionShapes}</Layer>
          </Stage>
        ) : (
          <></>
        )}
      </div>
    </>
  );
}

export default PageCanvas;
