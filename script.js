const VERSION = "Alpha 1.0";

class DrawingObject {
    constructor(path,color="#000000") {
        this.path = new Path2D;
        this.path.addPath(path);
        this.lineWidth = 5;
        this.color = color;
    }
}
class Layer {
    constructor() {
        this.objects = [];
        this.name = "NewLayer"
    }
    newObject(path,color) {
        let obj = new DrawingObject(path,color);
        this.objects.push(obj);
        return obj;
    }
}
class Renderer {
    layers = [];
    canvas = null;
    resolution = {
        w: 1080,
        h: 720
    };
    constructor(canvas) {
        this.canvas = canvas;
    }
    newLayer() {
        const l = new Layer();
        l.name += this.layers.length;
        this.layers.push(l);
    }
    render() {
        if (!this.canvas) return;

        this.canvas.width = this.resolution.w;
        this.canvas.height = this.resolution.h;
        this.canvas.style.width = this.resolution.w+"px";
        this.canvas.style.height = this.resolution.h+"px";

        const ctx = this.canvas.getContext("2d");
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        function renderLayer(layer) {
            if (!layer) return;
            layer.objects.forEach(v=>{
                ctx.strokeStyle = v.color;
                ctx.lineWidth = v.lineWidth;
                ctx.stroke(v.path);
            });
        }
        for (let i=this.layers.length-1;i>=0;i--) renderLayer(this.layers[i]);
    }
}
class Interface {
    // For drawings
    selectedLayer = 0;
    lineWidth = 5;
    eraser = false;
    color = "#000000";

    // For interface with DOM manipulation
    layerSection = null;
    layerElem = null; // Function to return a created DOM element

    constructor(renderer) {
        this.renderer = renderer;
        this.renderer.render();

        this.renderer.newLayer();
        this.prepare();
    }
    prepare() {
        this.renderer.canvas.addEventListener("mousedown",e=>{
            let canvasRect = this.renderer.canvas.getBoundingClientRect();
            let clientX = e.clientX - canvasRect.left;
            let clientY = e.clientY - canvasRect.top;

            const ctx = this.renderer.canvas.getContext("2d");
            if (!this.eraser) {
                let path = new Path2D;
                path.strokeStyle = this.color;
                path.moveTo(clientX,clientY);

                let draw = (e) => {
                    let canvasRect = this.renderer.canvas.getBoundingClientRect();
                    let clientX = e.clientX - canvasRect.left;
                    let clientY = e.clientY - canvasRect.top;

                    path.lineTo(clientX,clientY);
                    path.moveTo(clientX,clientY);

                    this.renderer.render();

                    ctx.lineWidth = this.lineWidth;
                    ctx.strokeStyle = this.color;
                    ctx.stroke(path);
                };
                let exit = (e) => {
                    this.renderer.canvas.removeEventListener("mousemove",draw);
                    let object = this.getSelectedLayer().newObject(path,this.color);
                    object.lineWidth = this.lineWidth;
                    this.renderer.render();
                    this.renderer.canvas.removeEventListener("mouseup",exit,{once:true});
                    this.renderer.canvas.removeEventListener("mouseout",exit,{once:true});
                };

                this.renderer.canvas.addEventListener("mousemove",draw);
                this.renderer.canvas.addEventListener("mouseup",exit,{once:true});
                this.renderer.canvas.addEventListener("mouseout",exit,{once:true});
            } else {
                let erase = e=>{
                    let clientX = e.clientX - canvasRect.left;
                    let clientY = e.clientY - canvasRect.top;

                    const layer = this.getSelectedLayer();
                    layer.objects = layer.objects.filter(obj=>{
                        ctx.lineWidth = obj.lineWidth;
                        return !ctx.isPointInStroke(obj.path,clientX,clientY);
                    });
                    this.renderer.render();
                    ctx.fillRect(clientX,clientY,this.lineWidth,this.lineWidth);
                }
                let exit = ()=>{
                    this.renderer.canvas.removeEventListener("mousemove",erase);
                }
                this.renderer.canvas.addEventListener("mousemove",erase);
                this.renderer.canvas.addEventListener("mouseout",exit,{once:true});
                this.renderer.canvas.addEventListener("mouseup",exit,{once:true});
            }
        });

        this.renderer.canvas.addEventListener("mouseenter",e=>{
            let canvasRect = this.renderer.canvas.getBoundingClientRect();
            let ctx = this.renderer.canvas.getContext("2d");
            let hover = e=>{
                this.renderer.render();
                let clientX = e.clientX - canvasRect.left;
                let clientY = e.clientY - canvasRect.top;
                ctx.fillStyle = this.color;
                ctx.fillRect(clientX,clientY,this.lineWidth,this.lineWidth);
            };
            let exit = ()=>{
                this.renderer.canvas.removeEventListener("mousemove",hover);
            };
            this.renderer.canvas.addEventListener("mousemove",hover);
            this.renderer.canvas.addEventListener("mouseout",exit,{once:true});
        })
    }
    getSelectedLayer() {
        return this.renderer.layers[this.selectedLayer];
    }
    prepareLayers() {
        if (!this.layerSection) return;
        this.layerSection.innerHTML = "";
        this.renderer.layers.forEach((layer,idx)=>{
            let l = this.layerElem(idx,layer.name,this);
            l.addEventListener("click",()=>{
                this.selectedLayer = idx;
                this.prepareLayers();
            });
            this.layerSection.appendChild(l);
        })
    }
    setAsLayerSection(layersUI,then=()=>{}) {
        this.layerSection = layersUI;
        then(layersUI,this);
    }
    eraserToggle(btn,then=()=>{}) {
        btn.addEventListener("click",()=>{
            this.eraser=!this.eraser
            then(btn,this);
        })
    }
    addLayerButton(btn,then=()=>{}) {
        btn.addEventListener("click",()=>{
            this.renderer.newLayer();
            this.prepareLayers();
            this.renderer.render();
            then(btn,this);
        })
    }
    removeLayerButton(btn,then=()=>{}) {
        btn.addEventListener("click",()=>{
            if (this.renderer.layers.length<=1) {
                if (!confirm("You cannot delete your only layer! Would you like to clear all objects instead?")) return;
                this.getSelectedLayer().objects = [];
                this.renderer.render();
                return;
            }
            this.renderer.layers.splice(this.selectedLayer,1);
            this.prepareLayers();
            this.renderer.render();
            if (this.selectedLayer>this.renderer.layers.length) this.selectedLayer--;
            if (this.selectedLayer<0) this.selectedLayer++;
            then(btn,this);
        })
    }
    goUpLayerButton(btn,then=()=>{}) {
        btn.addEventListener("click",()=>{
            if (this.selectedLayer >= this.renderer.layers.length-1) return;
            let temp = this.renderer.layers[this.selectedLayer+1];
            this.renderer.layers[this.selectedLayer+1] = this.getSelectedLayer();
            this.renderer.layers[this.selectedLayer] = temp;
            this.selectedLayer++;

            this.prepareLayers();
            this.renderer.render();
            then(btn,this);
        })
    }
    goDownLayerButton(btn,then=()=>{}) {
        btn.addEventListener("click",()=>{
            if (this.selectedLayer <= 0) return;
            let temp = this.renderer.layers[this.selectedLayer-1];
            this.renderer.layers[this.selectedLayer-1] = this.getSelectedLayer();
            this.renderer.layers[this.selectedLayer] = temp;
            this.selectedLayer--;
            
            this.prepareLayers();
            this.renderer.render();
            then(btn,this);
        })
    }
    renameLayerButton(btn,then=()=>{}) {
        btn.addEventListener("click",()=>{
            if (this.selectedLayer < 0) return;
            let defaultName = this.getSelectedLayer().name;
            this.getSelectedLayer().name = prompt("Enter a new name!",defaultName)??defaultName;
            this.prepareLayers();
            then(btn,this);
        })
    }
    paletteButton(btn,then=()=>{}) {
        btn.addEventListener("click",()=>{
            const c = document.createElement("input");
            c.type = "color";
            c.value = this.color;

            c.click();
            c.addEventListener("change",()=>{
                this.color = c.value;
                c.remove();
            },{once:true});

            then(btn,this);
        })
    }
}

let r = new Renderer(document.getElementById("drawingBoard"));
let i = new Interface(r);

i.eraserToggle(document.getElementById("eraserButton"), (b,i)=>{
    if (i.eraser) {
        b.querySelector("#icon").src = "img/draw.png";
    } else {
        b.querySelector("#icon").src = "img/eraser.png";
    }
});
i.addLayerButton(document.getElementById("addLayer"));
i.removeLayerButton(document.getElementById("removeLayer"));
i.goUpLayerButton(document.getElementById("moveUpLayer"));
i.goDownLayerButton(document.getElementById("moveDownLayer"));
i.renameLayerButton(document.getElementById("renameLayer"));
i.paletteButton(document.getElementById("paletteButton"));

i.setAsLayerSection(document.getElementById("layersUI"));
i.layerElem = (idx,name,gui)=>{
    const l = document.createElement("button");
    l.classList.add("layer-button");
    l.innerText = `${name} (${idx})`;
    if (gui.selectedLayer === idx) l.classList.add("selected");
    return l;
};
i.prepareLayers();

document.title = `WebPaint ${VERSION}`;