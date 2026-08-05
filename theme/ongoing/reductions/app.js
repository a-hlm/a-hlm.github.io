// Function to load YAML files
async function loadYaml(file) {
    try {
        console.log(`📁 Loading ${file}...`);
        const response = await fetch(file);
        
        if (!response.ok) {
            console.error(`❌ Failed to load ${file}: ${response.status}`);
            return [];
        }
        
        const text = await response.text();
        if (!text || text.trim() === '') {
            console.error(`❌ ${file} is empty`);
            return [];
        }
        
        try {
            const data = jsyaml.load(text);
            console.log(`✅ Successfully loaded ${file} with ${data ? data.length : 0} items`);
            return data || [];
        } catch (yamlError) {
            console.error(`❌ YAML parsing error in ${file}:`, yamlError);
            return [];
        }
    } catch (error) {
        console.error(`❌ Error loading ${file}:`, error);
        return [];
    }
}

// Function to trigger MathJax rendering
async function renderMathJax() {
    if (window.MathJax && MathJax.typeset) {
        try {
            await MathJax.typeset();
            console.log("✅ MathJax rendering complete");
        } catch (error) {
            console.error("❌ MathJax rendering error:", error);
        }
    }
}

// Function to create arrow marker
function createArrowMarker(defs, id, color, size = 10) {
    const marker = defs.append("marker")
        .attr("id", id)
        .attr("markerWidth", size)
        .attr("markerHeight", size)
        .attr("refX", size - 2)
        .attr("refY", size / 2)
        .attr("orient", "auto")
        .attr("markerUnits", "userSpaceOnUse");
    
    marker.append("path")
        .attr("d", `M 0 0 L ${size} ${size/2} L 0 ${size} Z`)
        .attr("fill", color);
    
    return marker;
}

async function main() {
    try {
        console.log("🚀 Starting application...");
        
        const problems = await loadYaml("data/problems.yml");
        const reductions = await loadYaml("data/reductions.yml");
        const references = await loadYaml("data/references.yml");

        console.log(`📊 Loaded: ${problems.length} problems, ${reductions.length} reductions, ${references.length} references`);

        if (!problems || problems.length === 0) {
            document.getElementById("info").innerHTML = `
                <p style="color: red; font-weight: bold;">Error: No data loaded!</p>
                <p>Check the browser console (F12) for details.</p>
            `;
            return;
        }

        const svg = d3.select("#graph");
        const g = svg.append("g");

        const width = window.innerWidth;
        const height = window.innerHeight;
        svg.attr("width", width).attr("height", height);

        const zoom = d3.zoom()
            .on("zoom", event => {
                g.attr("transform", event.transform);
            });
        svg.call(zoom);

        const defs = svg.append("defs");
        
        // Create arrow markers for different styles
        createArrowMarker(defs, "arrowhead-normal", "#000000", 10);
        createArrowMarker(defs, "arrowhead-thick", "#000000", 14);
        createArrowMarker(defs, "arrowhead-dashed", "#000000", 10);

        const nodes = problems.map(p => ({
            id: p.id,
            label: p.shortname || p.name || p.id,
            data: p,
            keywords: p.keywords || []
        }));

        // Process edges with defaults
        const edges = reductions.map(r => ({
            id: r.from + "-" + r.to,
            source: r.from,
            target: r.to,
            data: r,
            label: r.label || null,
            style: r.style || "normal",
            color: r.color || "#000000",
            references: r.references || []
        }));

        const elk = new ELK();
        const layout = await elk.layout({
            id: "root",
            children: nodes.map(n => ({
                id: n.id,
                width: 220,
                height: 80
            })),
            edges: edges.map(e => ({
                id: e.id,
                sources: [e.source],
                targets: [e.target]
            })),
            layoutOptions: {
                "elk.algorithm": "layered",
                "elk.direction": "DOWN",
                "elk.spacing.nodeNode": "200",
                "elk.layered.spacing.nodeNodeBetweenLayers": "180",
                "elk.edgeRouting": "SPLINES"
            }
        });

        const positions = {};
        layout.children.forEach(n => {
            positions[n.id] = n;
        });

        const edgeRoutes = {};
        layout.edges.forEach(e => {
            edgeRoutes[e.id] = e;
        });

        // Function to get the edge end point at node boundary
        function getEdgeEndPoint(sourcePos, targetPos, isUpward) {
            const nodeHalfWidth = 110;
            const nodeHeight = 80;
            
            if (isUpward) {
                return {
                    x: targetPos.x + nodeHalfWidth,
                    y: targetPos.y + nodeHeight
                };
            } else {
                return {
                    x: targetPos.x + nodeHalfWidth,
                    y: targetPos.y
                };
            }
        }

        // Function to get the edge start point from source node boundary
        function getEdgeStartPoint(sourcePos, targetPos, isUpward) {
            const nodeHalfWidth = 110;
            const nodeHeight = 80;
            
            if (isUpward) {
                return {
                    x: sourcePos.x + nodeHalfWidth,
                    y: sourcePos.y
                };
            } else {
                return {
                    x: sourcePos.x + nodeHalfWidth,
                    y: sourcePos.y + nodeHeight
                };
            }
        }

        edges.forEach(edge => {
            const sourcePos = positions[edge.source];
            const targetPos = positions[edge.target];
            
            if (!sourcePos || !targetPos) {
                console.warn(`⚠️ Missing position for edge ${edge.id}`);
                return;
            }

            const isUpward = targetPos.y < sourcePos.y;
            const startPoint = getEdgeStartPoint(sourcePos, targetPos, isUpward);
            const endPoint = getEdgeEndPoint(sourcePos, targetPos, isUpward);
            const midX = (startPoint.x + endPoint.x) / 2;
            const midY = (startPoint.y + endPoint.y) / 2;
            
            let pathPoints = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
            
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const length = Math.sqrt(dx*dx + dy*dy);
            
            if (length > 50) {
                const midXOffset = isUpward ? -20 : 20;
                const cpX = midX + midXOffset;
                const cpY = midY;
                pathPoints = `M ${startPoint.x} ${startPoint.y} Q ${cpX} ${cpY} ${endPoint.x} ${endPoint.y}`;
            }

            let path = g.append("path")
                .attr("class", "edge")
                .attr("d", pathPoints)
                .attr("fill", "none")
                .attr("stroke", edge.color)
                .attr("stroke-width", edge.style === "thick" ? 4 : 2.5)
                .attr("data-edge-id", edge.id)
                .attr("data-source", edge.source)
                .attr("data-target", edge.target)
                .style("pointer-events", "none")
                .style("transition", "opacity 0.2s ease");

            let markerId = "arrowhead-normal";
            
            if (edge.style === "dashed") {
                path.attr("stroke-dasharray", "8,5");
                markerId = "arrowhead-dashed";
            } else if (edge.style === "thick") {
                path.attr("stroke-width", 4);
                markerId = "arrowhead-thick";
            }

            path.attr("marker-end", `url(#${markerId})`);

            const hasLabel = edge.label && edge.label.trim() !== '';
            const hasRefs = edge.references && edge.references.length > 0;
            
            if (hasLabel || hasRefs) {
                const labelGroup = g.append("g")
                    .attr("class", "edge-label-group")
                    .attr("data-edge-id", edge.id)
                    .attr("data-source", edge.source)
                    .attr("data-target", edge.target)
                    .style("cursor", hasRefs ? "pointer" : "default")
                    .style("pointer-events", "all")
                    .style("transition", "opacity 0.2s ease");

                let labelHTML = '';
                
                if (hasLabel) {
                    labelHTML += `<div style="font-size: 14px; font-weight: bold; color: ${edge.color}; text-align: center; line-height: 1.4;">${edge.label}</div>`;
                }
                
                if (hasRefs) {
                    const refLinks = edge.references.map((r) => {
                        const ref = references.find(x => x.id === r);
                        if (ref) {
                            return `<a href="${ref.url}" target="_blank" style="color: ${edge.color}; text-decoration: none; border-bottom: 1px dotted ${edge.color}; font-size: 12px; cursor: pointer; padding: 0 2px;">${ref.short}</a>`;
                        }
                        return `<span style="font-size: 12px; color: ${edge.color};">${r}</span>`;
                    });
                    
                    const refsHTML = refLinks.reduce((acc, link, index) => {
                        if (index === 0) return link;
                        return `${acc}, ${link}`;
                    }, '');
                    
                    labelHTML += `<div style="font-size: 12px; color: ${edge.color}; text-align: center; margin-top: ${hasLabel ? '2px' : '0'}; line-height: 1.4;">${refsHTML}</div>`;
                }

                const tempDiv = document.createElement('div');
                tempDiv.style.cssText = 'position: absolute; visibility: hidden; font-family: serif; font-size: 14px; white-space: nowrap;';
                const cleanText = (hasLabel ? edge.label.replace(/\$[^$]*\$/g, 'M') : '') + (hasRefs ? ' ' + edge.references.map(r => r).join(', ') : '');
                tempDiv.textContent = cleanText || ' ';
                document.body.appendChild(tempDiv);
                const textWidth = Math.max(tempDiv.offsetWidth + 40, 80);
                const textHeight = (hasLabel && hasRefs) ? 60 : 40;
                document.body.removeChild(tempDiv);

                const labelOffset = isUpward ? -20 : 20;
                const labelX = midX;
                const labelY = midY + labelOffset;

                const bgRect = labelGroup.append("rect")
                    .attr("x", labelX - textWidth/2)
                    .attr("y", labelY - textHeight/2)
                    .attr("width", textWidth)
                    .attr("height", textHeight)
                    .attr("rx", 6)
                    .attr("ry", 6)
                    .attr("fill", "white")
                    .attr("stroke", "#ddd")
                    .attr("stroke-width", 1)
                    .style("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.1))")
                    .style("pointer-events", "none")
                    .style("transition", "all 0.2s ease");

                const labelContainer = labelGroup.append("foreignObject")
                    .attr("x", labelX - textWidth/2 + 8)
                    .attr("y", labelY - textHeight/2 + 4)
                    .attr("width", textWidth - 16)
                    .attr("height", textHeight - 8)
                    .style("pointer-events", "none");

                const labelDiv = labelContainer.append("xhtml:div")
                    .style("width", "100%")
                    .style("height", "100%")
                    .style("display", "flex")
                    .style("flex-direction", "column")
                    .style("justify-content", "center")
                    .style("align-items", "center")
                    .style("font-family", "serif")
                    .style("pointer-events", "auto")
                    .style("text-align", "center")
                    .html(labelHTML);

                labelGroup.on("mouseenter", function() {
                    const sourceId = this.getAttribute("data-source");
                    const targetId = this.getAttribute("data-target");
                    
                    g.selectAll(".edge")
                        .style("opacity", function() {
                            const edgeSource = this.getAttribute("data-source");
                            const edgeTarget = this.getAttribute("data-target");
                            return (edgeSource === sourceId && edgeTarget === targetId) ? 1 : 0.1;
                        });
                    
                    g.selectAll(".node")
                        .style("opacity", function() {
                            const nodeId = this.getAttribute("data-id");
                            return (nodeId === sourceId || nodeId === targetId) ? 1 : 0.1;
                        });
                    
                    g.selectAll(".edge-label-group")
                        .style("opacity", function() {
                            const thisSource = this.getAttribute("data-source");
                            const thisTarget = this.getAttribute("data-target");
                            return (thisSource === sourceId && thisTarget === targetId) ? 1 : 0.1;
                        });
                    
                    this.parentNode.appendChild(this);
                    
                    bgRect.style("filter", "drop-shadow(0 2px 8px rgba(0,0,0,0.3))");
                    bgRect.style("stroke", "#000");
                    bgRect.style("stroke-width", 2);
                })
                .on("mouseleave", function() {
                    g.selectAll(".edge")
                        .style("opacity", 1);
                    g.selectAll(".node")
                        .style("opacity", 1);
                    g.selectAll(".edge-label-group")
                        .style("opacity", 1);
                    
                    bgRect.style("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.1))");
                    bgRect.style("stroke", "#ddd");
                    bgRect.style("stroke-width", 1);
                });

                if (hasRefs) {
                    labelDiv.selectAll("a")
                        .style("pointer-events", "auto")
                        .on("click", function(event) {
                            event.stopPropagation();
                        })
                        .on("mouseenter", function() {
                            d3.select(this)
                                .style("border-bottom", "2px solid " + edge.color);
                        })
                        .on("mouseleave", function() {
                            d3.select(this)
                                .style("border-bottom", "1px dotted " + edge.color);
                        });

                    labelGroup.on("click", function(event) {
                        if (event.target.tagName !== 'A' && edge.references.length > 0) {
                            edge.references.forEach(r => {
                                const ref = references.find(x => x.id === r);
                                if (ref && ref.url) {
                                    window.open(ref.url, '_blank');
                                }
                            });
                        }
                    });
                }

                if (edge.label && edge.label.includes('$')) {
                    setTimeout(() => {
                        renderMathJax();
                    }, 100);
                }
            }
        });

        // NODES
        const node = g.selectAll(".node")
            .data(nodes)
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("data-id", d => d.id)
            .attr("transform", d => `translate(${positions[d.id].x}, ${positions[d.id].y})`)
            .style("cursor", "pointer")
            .style("transition", "opacity 0.2s ease")
            .style("pointer-events", "all");

        node.append("rect")
            .attr("width", 220)
            .attr("height", 80)
            .attr("rx", 15)
            .attr("ry", 15)
            .attr("fill", d => {
                if (d.keywords.includes("dim 1") && d.keywords.includes("dim 2")) return "#e8f4f8";
                if (d.keywords.includes("dim 1")) return "#d4e6f1";
                if (d.keywords.includes("dim 2")) return "#ebdef0";
                if (d.keywords.includes("oriented")) return "#fdebd0";
                return "white";
            })
            .attr("stroke", d => {
                if (d.keywords.includes("dim 1") && d.keywords.includes("dim 2")) return "#2980b9";
                if (d.keywords.includes("dim 1")) return "#2471a3";
                if (d.keywords.includes("dim 2")) return "#7d3c98";
                if (d.keywords.includes("oriented")) return "#d35400";
                return "#555";
            })
            .attr("stroke-width", 2)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
            .style("transition", "all 0.2s ease");

        node.append("foreignObject")
            .attr("width", 220)
            .attr("height", 80)
            .append("xhtml:div")
            .attr("class", "nodeContent")
            .html(d => d.label);

        node.on("mouseenter", function() {
            const nodeId = this.getAttribute("data-id");
            
            g.selectAll(".edge")
                .style("opacity", function() {
                    const edgeSource = this.getAttribute("data-source");
                    const edgeTarget = this.getAttribute("data-target");
                    return (edgeSource === nodeId || edgeTarget === nodeId) ? 1 : 0.1;
                });
            
            const connectedNodes = new Set();
            const connectedEdges = new Set();
            
            g.selectAll(".edge").each(function() {
                const edgeSource = this.getAttribute("data-source");
                const edgeTarget = this.getAttribute("data-target");
                if (edgeSource === nodeId || edgeTarget === nodeId) {
                    connectedNodes.add(edgeSource);
                    connectedNodes.add(edgeTarget);
                    connectedEdges.add(edgeSource + "-" + edgeTarget);
                }
            });
            
            g.selectAll(".node")
                .style("opacity", function() {
                    const thisNodeId = this.getAttribute("data-id");
                    return connectedNodes.has(thisNodeId) ? 1 : 0.1;
                });
            
            g.selectAll(".edge-label-group")
                .style("opacity", function() {
                    const thisSource = this.getAttribute("data-source");
                    const thisTarget = this.getAttribute("data-target");
                    const edgeId = thisSource + "-" + thisTarget;
                    return connectedEdges.has(edgeId) ? 1 : 0.1;
                });
            
            g.selectAll(".node").each(function() {
                const thisNodeId = this.getAttribute("data-id");
                if (connectedNodes.has(thisNodeId)) {
                    this.parentNode.appendChild(this);
                }
            });
            
            g.selectAll(".edge-label-group").each(function() {
                const thisSource = this.getAttribute("data-source");
                const thisTarget = this.getAttribute("data-target");
                const edgeId = thisSource + "-" + thisTarget;
                if (connectedEdges.has(edgeId)) {
                    this.parentNode.appendChild(this);
                }
            });
        })
        .on("mouseleave", function() {
            g.selectAll(".edge")
                .style("opacity", 1);
            g.selectAll(".node")
                .style("opacity", 1);
            g.selectAll(".edge-label-group")
                .style("opacity", 1);
        });

        node.on("click", (event, d) => {
            const displayName = d.data.fullname || d.data.name || d.data.id;
            
            let html = `
                <h2>${displayName}</h2>
                <p><b>Description:</b> ${d.data.description || "No description"}</p>
                <p><b>Family:</b> ${d.data.family || "Unspecified"}</p>
                <p><b>Keywords:</b> ${d.keywords.length > 0 ? d.keywords.join(", ") : "none"}</p>
                <h3>References</h3>
                <ul>
            `;
            
            if (d.data.references && d.data.references.length > 0) {
                d.data.references.forEach(r => {
                    let ref = references.find(x => x.id === r);
                    if (!ref) {
                        html += `<li>${r}</li>`;
                    } else {
                        html += `
                            <li>
                                <a href="${ref.url}" target="_blank">${ref.short}</a>
                                ${ref.title ? `- ${ref.title}` : ""}
                            </li>
                        `;
                    }
                });
            } else {
                html += `<li>No references available</li>`;
            }
            
            html += `</ul>`;
            
            document.getElementById("info").innerHTML = html;
            
            renderMathJax();
        });

        const search = document.getElementById("search");
        search.addEventListener("input", () => {
            const q = search.value.toLowerCase().trim();
            
            node.style("opacity", d => {
                if (!q) return 1;
                const shortMatch = (d.data.shortname || "").toLowerCase().includes(q);
                const fullMatch = (d.data.fullname || "").toLowerCase().includes(q);
                const nameMatch = (d.data.name || "").toLowerCase().includes(q);
                const keywordMatch = d.keywords.some(k => k.toLowerCase().includes(q));
                const descMatch = (d.data.description || "").toLowerCase().includes(q);
                return (shortMatch || fullMatch || nameMatch || keywordMatch || descMatch) ? 1 : 0.15;
            });
        });

        // Initial MathJax rendering
        setTimeout(() => {
            renderMathJax();
        }, 500);

        window.addEventListener("resize", () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            svg.attr("width", width).attr("height", height);
        });

        console.log("✅ Graph rendering complete!");

    } catch (error) {
        console.error("❌ Error in main():", error);
        document.getElementById("info").innerHTML = `
            <p style="color: red; font-weight: bold;">Error: ${error.message}</p>
            <p>Check the browser console for more details (F12).</p>
        `;
    }
}

main().catch(err => {
    console.error("❌ Fatal error:", err);
    document.getElementById("info").innerHTML = `
        <p style="color: red; font-weight: bold;">Fatal error: ${err.message}</p>
        <p>Check the browser console for more details (F12).</p>
    `;
});
