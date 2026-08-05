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

// Global state
let highlightState = {
    mode: 'none',
    nodeId: null,
    easierNodes: null,
    harderNodes: null,
    equivalentNodes: null,
    allHighlighted: null,
    edges: []
};

// Conditions state
let conditionsState = {
    GRH: true,
    discOOp43: true,
    SSOPequalSS: true,
    factorisation: true,
    quantum: true
};

// Function to check if an edge is active under current conditions
function isEdgeActive(edge) {
    if (!edge.conditions || edge.conditions.length === 0) {
        return true;
    }
    return edge.conditions.every(c => conditionsState[c] !== false);
}

// Function to check if a node matches any of the search keywords
function nodeMatchesSearch(d, keywords) {
    if (!keywords || keywords.length === 0) return false;
    
    return keywords.some(keyword => {
        const k = keyword.toLowerCase().trim();
        if (!k) return false;
        const shortMatch = (d.data.shortname || "").toLowerCase().includes(k);
        const fullMatch = (d.data.fullname || "").toLowerCase().includes(k);
        const nameMatch = (d.data.name || "").toLowerCase().includes(k);
        const keywordMatch = d.keywords.some(kw => kw.toLowerCase().includes(k));
        const descMatch = (d.data.description || "").toLowerCase().includes(k);
        return shortMatch || fullMatch || nameMatch || keywordMatch || descMatch;
    });
}

// Function to find all nodes reachable from a starting node (following edge directions)
function findReachableNodes(startId, edges, direction) {
    const visited = new Set();
    const queue = [startId];
    visited.add(startId);
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        for (const edge of edges) {
            if (!isEdgeActive(edge)) continue;
            
            let from, to;
            if (direction === 'forward') {
                from = edge.source;
                to = edge.target;
            } else {
                from = edge.target;
                to = edge.source;
            }
            
            if (from === current && !visited.has(to)) {
                visited.add(to);
                queue.push(to);
            }
        }
    }
    
    return visited;
}

// Function to highlight based on search
function highlightSearchMatches(g, matchingNodeIds) {
    if (matchingNodeIds.size === 0) {
        resetHighlight(g);
        return;
    }

    highlightState.mode = 'search';
    const connectedNodes = new Set(matchingNodeIds);
    const connectedEdges = new Set();
    
    g.selectAll(".edge").each(function() {
        const edgeSource = this.getAttribute("data-source");
        const edgeTarget = this.getAttribute("data-target");
        if (matchingNodeIds.has(edgeSource) && matchingNodeIds.has(edgeTarget)) {
            connectedEdges.add(edgeSource + "-" + edgeTarget);
        }
    });

    applyHighlight(g, connectedNodes, connectedEdges);
}

// Function to highlight based on node hover
function highlightNodeMatches(g, matchingNodeIds) {
    if (matchingNodeIds.size === 0) return;

    if (highlightState.mode === 'node_click') {
        const connectedNodes = new Set(matchingNodeIds);
        g.selectAll(".node").each(function() {
            const nodeId = this.getAttribute("data-id");
            const isInHover = connectedNodes.has(nodeId);
            const isInClick = highlightState.allHighlighted.has(nodeId);
            if (isInHover && isInClick) {
                d3.select(this).style("opacity", 1);
            } else if (isInClick) {
                d3.select(this).style("opacity", 0.8);
            } else if (isInHover) {
                d3.select(this).style("opacity", 0.6);
            } else {
                d3.select(this).style("opacity", 0.05);
            }
        });
        return;
    }

    highlightState.mode = 'hover';
    const connectedNodes = new Set(matchingNodeIds);
    const connectedEdges = new Set();
    
    g.selectAll(".edge").each(function() {
        const edgeSource = this.getAttribute("data-source");
        const edgeTarget = this.getAttribute("data-target");
        if (matchingNodeIds.has(edgeSource) || matchingNodeIds.has(edgeTarget)) {
            connectedNodes.add(edgeSource);
            connectedNodes.add(edgeTarget);
            connectedEdges.add(edgeSource + "-" + edgeTarget);
        }
    });

    applyHighlight(g, connectedNodes, connectedEdges);
}

// Function to highlight based on edge hover
function highlightEdgeMatch(g, sourceId, targetId) {
    if (highlightState.mode === 'node_click') {
        const connectedNodes = new Set([sourceId, targetId]);
        g.selectAll(".node").each(function() {
            const nodeId = this.getAttribute("data-id");
            const isInHover = connectedNodes.has(nodeId);
            const isInClick = highlightState.allHighlighted.has(nodeId);
            if (isInHover && isInClick) {
                d3.select(this).style("opacity", 1);
            } else if (isInClick) {
                d3.select(this).style("opacity", 0.8);
            } else if (isInHover) {
                d3.select(this).style("opacity", 0.6);
            } else {
                d3.select(this).style("opacity", 0.05);
            }
        });
        return;
    }
    
    highlightState.mode = 'hover';
    const connectedNodes = new Set([sourceId, targetId]);
    const connectedEdges = new Set([sourceId + "-" + targetId]);
    
    applyHighlight(g, connectedNodes, connectedEdges);
}

// Function to apply the actual highlighting
function applyHighlight(g, connectedNodes, connectedEdges) {
    g.selectAll(".edge")
        .style("opacity", function() {
            const edgeSource = this.getAttribute("data-source");
            const edgeTarget = this.getAttribute("data-target");
            const edgeId = edgeSource + "-" + edgeTarget;
            const isHighlighted = connectedEdges.has(edgeId);
            const edge = highlightState.edges.find(e => e.source === edgeSource && e.target === edgeTarget);
            const isActive = edge ? isEdgeActive(edge) : true;
            if (isHighlighted) {
                return isActive ? 1 : 0.4;
            }
            return isActive ? 0.05 : 0.02;
        })
        .style("stroke-width", function() {
            const edgeSource = this.getAttribute("data-source");
            const edgeTarget = this.getAttribute("data-target");
            const edgeId = edgeSource + "-" + edgeTarget;
            const isHighlighted = connectedEdges.has(edgeId);
            const style = this.getAttribute("data-style") || "normal";
            if (isHighlighted) {
                return style === "thick" ? 4 : 1.25;
            }
            return style === "thick" ? 4 : 1.25;
        });

    g.selectAll(".node")
        .style("opacity", function() {
            const nodeId = this.getAttribute("data-id");
            return connectedNodes.has(nodeId) ? 1 : 0.05;
        });

    g.selectAll(".edge-label-group")
        .style("opacity", function() {
            const thisSource = this.getAttribute("data-source");
            const thisTarget = this.getAttribute("data-target");
            const edgeId = thisSource + "-" + thisTarget;
            const isHighlighted = connectedEdges.has(edgeId);
            const edge = highlightState.edges.find(e => e.source === thisSource && e.target === thisTarget);
            const isActive = edge ? isEdgeActive(edge) : true;
            if (isHighlighted) {
                return isActive ? 1 : 0.4;
            }
            return isActive ? 0.05 : 0.02;
        });

    g.selectAll(".node").each(function() {
        const nodeId = this.getAttribute("data-id");
        if (connectedNodes.has(nodeId)) {
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
}

// Function to reset highlighting
function resetHighlight(g) {
    highlightState.mode = 'none';
    
    g.selectAll(".node").each(function() {
        const d = d3.select(this).data()[0];
        const rect = this.querySelector("rect");
        if (d && rect) {
            let fillColor = "white";
            let strokeColor = "#555";
            if (d.keywords.includes("dim 1") && d.keywords.includes("dim 2")) {
                fillColor = "#e8f4f8";
                strokeColor = "#2980b9";
            } else if (d.keywords.includes("dim 1")) {
                fillColor = "#d4e6f1";
                strokeColor = "#2471a3";
            } else if (d.keywords.includes("dim 2")) {
                fillColor = "#ebdef0";
                strokeColor = "#7d3c98";
            } else if (d.keywords.includes("oriented")) {
                fillColor = "#fdebd0";
                strokeColor = "#d35400";
            }
            d3.select(rect).style("fill", fillColor, "important");
            d3.select(rect).style("stroke", strokeColor, "important");
            d3.select(rect).style("stroke-width", "2px", "important");
        }
        d3.select(this).style("opacity", 1);
    });
    
    g.selectAll(".edge")
        .style("opacity", 1)
        .style("stroke-width", function() {
            const style = this.getAttribute("data-style") || "normal";
            return style === "thick" ? 4 : 1.25;
        });
    
    g.selectAll(".edge-label-group")
        .style("opacity", 1);
}

// Function to reapply search if active
function reapplySearch(g, searchInput) {
    const q = searchInput.value.trim();
    if (q === '') {
        resetHighlight(g);
        return;
    }
    
    const keywords = q.split(',').map(k => k.trim()).filter(k => k !== '');
    
    const matchingIds = new Set();
    g.selectAll(".node").each(function() {
        const d = d3.select(this).data()[0];
        if (d && nodeMatchesSearch(d, keywords)) {
            matchingIds.add(d.id);
        }
    });
    
    highlightSearchMatches(g, matchingIds);
}

// Function to get node shortname by ID
function getNodeShortname(nodes, id) {
    const node = nodes.find(n => n.id === id);
    return node ? node.data.shortname || node.data.name || node.id : id;
}

// Function to show reduction info in the sidebar
function showReductionInfo(edgeData, nodes, references) {
    const infoDiv = document.getElementById("info");
    
    const fromName = getNodeShortname(nodes, edgeData.source);
    const toName = getNodeShortname(nodes, edgeData.target);
    
    let html = `<h2>${fromName} → ${toName}</h2>`;
    
    const hasLabel = edgeData.label && edgeData.label.trim() !== '';
    
    if (!hasLabel) {
        html += `<p><b>Reduction type:</b> Trivial reduction</p>`;
    }
    
    if (edgeData.style === "thick") {
        html += `<p><b>Oracle queries:</b> polynomial number</p>`;
    } else {
        html += `<p><b>Oracle queries:</b> constant number</p>`;
    }
    
    if (edgeData.conditions && edgeData.conditions.includes('quantum')) {
        html += `<p><b>Quantum:</b> The reduction is quantum</p>`;
    }
    
    if (edgeData.longlabel && edgeData.longlabel.trim() !== '') {
        html += `<p><b>Condition(s):</b> ${edgeData.longlabel}</p>`;
    }
    
    const allRefs = edgeData.references || [];
    
    if (allRefs.length > 0) {
        const mainRef = references.find(r => r.id === allRefs[0]);
        const otherRefs = allRefs.slice(1);
        
        if (mainRef) {
            html += `<p><b>Main reference:</b> <a href="${mainRef.url}" target="_blank">${mainRef.short}</a>`;
            if (mainRef.title) {
                html += ` - ${mainRef.title}`;
            }
            html += `</p>`;
        }
        
        if (otherRefs.length > 0) {
            html += `<p><b>Other references:</b> `;
            const refLinks = otherRefs.map(r => {
                const ref = references.find(x => x.id === r);
                if (ref) {
                    return `<a href="${ref.url}" target="_blank">${ref.short}</a>`;
                }
                return r;
            });
            html += refLinks.join(', ');
            html += `</p>`;
        }
    } else {
        html += `<p><i>No references available</i></p>`;
    }
    
    infoDiv.innerHTML = html;
    
    if (window.MathJax && MathJax.typeset) {
        MathJax.typeset();
    }
}

// Function to highlight node click with color coding
function highlightNodeClick(g, nodeId, edges) {
    console.log("highlightNodeClick called for node:", nodeId);
    
    const easierNodes = findReachableNodes(nodeId, edges, 'forward');
    const harderNodes = findReachableNodes(nodeId, edges, 'backward');
    
    const equivalentNodes = new Set();
    for (const id of easierNodes) {
        if (harderNodes.has(id)) {
            equivalentNodes.add(id);
        }
    }
    
    easierNodes.delete(nodeId);
    harderNodes.delete(nodeId);
    
    const allHighlighted = new Set([nodeId, ...equivalentNodes, ...easierNodes, ...harderNodes]);
    
    highlightState.mode = 'node_click';
    highlightState.nodeId = nodeId;
    highlightState.easierNodes = easierNodes;
    highlightState.harderNodes = harderNodes;
    highlightState.equivalentNodes = equivalentNodes;
    highlightState.allHighlighted = allHighlighted;
    
    // Apply highlighting with colors using STYLE with !important
    g.selectAll(".node").each(function() {
        const id = d3.select(this).attr("data-id");
        const rect = d3.select(this).select("rect");
        const isHighlighted = allHighlighted.has(id);
        
        d3.select(this).style("opacity", isHighlighted ? 1 : 0.05);
        
        if (isHighlighted) {
            let fillColor, strokeColor;
            if (id === nodeId) {
                fillColor = "#FFD700";
                strokeColor = "#D4A017";
            } else if (equivalentNodes.has(id)) {
                fillColor = "#9B59B6";
                strokeColor = "#6C3483";
            } else if (easierNodes.has(id)) {
                fillColor = "#E74C3C";
                strokeColor = "#922B21";
            } else if (harderNodes.has(id)) {
                fillColor = "#2ECC71";
                strokeColor = "#1E8449";
            } else {
                fillColor = "white";
                strokeColor = "#555";
            }
            rect.style("fill", fillColor, "important");
            rect.style("stroke", strokeColor, "important");
            rect.style("stroke-width", "3px", "important");
        } else {
            const d = d3.select(this).data()[0];
            if (d) {
                let fillColor = "white";
                let strokeColor = "#555";
                if (d.keywords.includes("dim 1") && d.keywords.includes("dim 2")) {
                    fillColor = "#e8f4f8";
                    strokeColor = "#2980b9";
                } else if (d.keywords.includes("dim 1")) {
                    fillColor = "#d4e6f1";
                    strokeColor = "#2471a3";
                } else if (d.keywords.includes("dim 2")) {
                    fillColor = "#ebdef0";
                    strokeColor = "#7d3c98";
                } else if (d.keywords.includes("oriented")) {
                    fillColor = "#fdebd0";
                    strokeColor = "#d35400";
                }
                rect.style("fill", fillColor, "important");
                rect.style("stroke", strokeColor, "important");
                rect.style("stroke-width", "2px", "important");
            }
        }
    });

    g.selectAll(".edge")
        .style("opacity", function() {
            const edgeSource = d3.select(this).attr("data-source");
            const edgeTarget = d3.select(this).attr("data-target");
            const edge = highlightState.edges.find(e => e.source === edgeSource && e.target === edgeTarget);
            const isActive = edge ? isEdgeActive(edge) : true;
            if (allHighlighted.has(edgeSource) && allHighlighted.has(edgeTarget)) {
                return isActive ? 1 : 0.4;
            }
            return isActive ? 0.05 : 0.02;
        });

    g.selectAll(".edge-label-group")
        .style("opacity", function() {
            const thisSource = d3.select(this).attr("data-source");
            const thisTarget = d3.select(this).attr("data-target");
            const edge = highlightState.edges.find(e => e.source === thisSource && e.target === thisTarget);
            const isActive = edge ? isEdgeActive(edge) : true;
            if (allHighlighted.has(thisSource) && allHighlighted.has(thisTarget)) {
                return isActive ? 1 : 0.4;
            }
            return isActive ? 0.05 : 0.02;
        });

    g.selectAll(".node").each(function() {
        const id = d3.select(this).attr("data-id");
        if (allHighlighted.has(id)) {
            this.parentNode.appendChild(this);
        }
    });
    
    g.selectAll(".edge-label-group").each(function() {
        const thisSource = d3.select(this).attr("data-source");
        const thisTarget = d3.select(this).attr("data-target");
        if (allHighlighted.has(thisSource) && allHighlighted.has(thisTarget)) {
            this.parentNode.appendChild(this);
        }
    });
}

// Function to update conditions and re-render
function updateConditions() {
    const g = d3.select("#graph").select("g");
    if (highlightState.mode === 'node_click' && highlightState.nodeId) {
        highlightNodeClick(g, highlightState.nodeId, highlightState.edges);
    } else {
        const searchInput = document.getElementById("search");
        if (searchInput && searchInput.value.trim() !== '') {
            reapplySearch(g, searchInput);
        } else {
            // Just reset to apply condition opacities
            resetHighlight(g);
        }
    }
}

// Function to rebuild the conditions menu
function rebuildConditionsMenu(edges) {
    const menuContainer = document.getElementById("conditions-menu");
    if (!menuContainer) return;
    
    const allConditions = new Set();
    edges.forEach(edge => {
        if (edge.conditions) {
            edge.conditions.forEach(c => allConditions.add(c));
        }
    });
    
    let html = '<h3 style="margin: 0 0 8px 0; font-size: 14px;">Conditions</h3>';
    html += '<div style="display: flex; flex-direction: column; gap: 5px;">';
    
    if (allConditions.has('GRH')) {
        html += `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
                <input type="checkbox" id="cond-GRH" ${conditionsState.GRH !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                <span>GRH</span>
                <span style="font-size: 11px; color: #666; margin-left: 5px;">(Generalized Riemann Hypothesis)</span>
            </label>
        `;
    }
    
    if (allConditions.has('SSOPequalSS')) {
        html += `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
                <input type="checkbox" id="cond-SSOPequalSS" ${conditionsState.SSOPequalSS !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                <span>SS<sub>O</sub>(p) = SS(p)</span>
                <span style="font-size: 11px; color: #666; margin-left: 5px;">(equality condition)</span>
            </label>
        `;
    }
    
    if (allConditions.has('discOOp43')) {
        html += `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
                <input type="checkbox" id="cond-discOOp43" ${conditionsState.discOOp43 !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                <span>disc(O) = O(p<sup>4/3</sup>)</span>
                <span style="font-size: 11px; color: #666; margin-left: 5px;">(discriminant bound)</span>
            </label>
        `;
    }
    
    if (allConditions.has('factorisation')) {
        html += `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
                <input type="checkbox" id="cond-factorisation" ${conditionsState.factorisation !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                <span>Factorisation</span>
                <span style="font-size: 11px; color: #666; margin-left: 5px;">(of disc(O))</span>
            </label>
        `;
    }
    
    if (allConditions.has('quantum')) {
        html += `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
                <input type="checkbox" id="cond-quantum" ${conditionsState.quantum !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                <span>Quantum</span>
                <span style="font-size: 11px; color: #666; margin-left: 5px;">(quantum reductions)</span>
            </label>
        `;
    }
    
    html += '</div>';
    menuContainer.innerHTML = html;
    
    document.querySelectorAll('#conditions-menu input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', function() {
            const id = this.id.replace('cond-', '');
            
            if (id === 'quantum') {
                const factorisationCheckbox = document.getElementById('cond-factorisation');
                if (factorisationCheckbox) {
                    if (this.checked) {
                        factorisationCheckbox.checked = true;
                        conditionsState.factorisation = true;
                    }
                }
            }
            
            conditionsState[id] = this.checked;
            updateConditions();
        });
    });
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

        const nodes = problems.map(p => ({
            id: p.id,
            label: p.shortname || p.name || p.id,
            data: p,
            keywords: p.keywords || []
        }));

        const edges = reductions.map(r => ({
            id: r.from + "-" + r.to,
            source: r.from,
            target: r.to,
            data: r,
            label: r.label || null,
            longlabel: r.longlabel || null,
            style: r.style || "normal",
            color: r.color || "#000000",
            conditions: r.conditions || [],
            references: r.references || []
        }));

        highlightState.edges = edges;

        const uniqueColors = new Set(edges.map(e => e.color));
        uniqueColors.forEach(color => {
            const markerId = "arrowhead-" + color.replace('#', '');
            createArrowMarker(defs, markerId, color, 10);
            createArrowMarker(defs, markerId + "-thick", color, 14);
        });
        createArrowMarker(defs, "arrowhead-normal", "#000000", 10);
        createArrowMarker(defs, "arrowhead-thick", "#000000", 14);
        createArrowMarker(defs, "arrowhead-dashed", "#000000", 10);

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

            const hasLongLabel = edge.longlabel && edge.longlabel.trim() !== '';
            const isDashed = hasLongLabel || edge.style === "dashed";
            const isThick = edge.style === "thick";

            const colorKey = edge.color.replace('#', '');
            let markerId = "arrowhead-" + colorKey + (isThick ? "-thick" : "");
            
            if (!document.getElementById(markerId)) {
                if (isDashed) {
                    markerId = "arrowhead-dashed";
                } else if (isThick) {
                    markerId = "arrowhead-thick";
                } else {
                    markerId = "arrowhead-normal";
                }
            }

            let path = g.append("path")
                .attr("class", "edge")
                .attr("d", pathPoints)
                .attr("fill", "none")
                .attr("stroke", edge.color)
                .style("stroke-width", isThick ? 4 : 1.25)
                .attr("data-edge-id", edge.id)
                .attr("data-source", edge.source)
                .attr("data-target", edge.target)
                .attr("data-style", edge.style)
                .style("pointer-events", "all")
                .style("transition", "all 0.2s ease")
                .style("cursor", "pointer")
                .on("click", function(event) {
                    event.stopPropagation();
                    const sourceId = this.getAttribute("data-source");
                    const targetId = this.getAttribute("data-target");
                    const edgeData = edges.find(e => e.source === sourceId && e.target === targetId);
                    if (edgeData) {
                        showReductionInfo(edgeData, nodes, references);
                    }
                });

            if (isDashed) {
                path.attr("stroke-dasharray", "8,5");
            }

            path.attr("marker-end", `url(#${markerId})`);

            const hoverOverlay = g.append("path")
                .attr("d", pathPoints)
                .attr("fill", "none")
                .attr("stroke", "transparent")
                .attr("stroke-width", 20)
                .attr("data-source", edge.source)
                .attr("data-target", edge.target)
                .style("pointer-events", "all")
                .style("cursor", "pointer");

            hoverOverlay.on("mouseenter", function() {
                const sourceId = this.getAttribute("data-source");
                const targetId = this.getAttribute("data-target");
                highlightEdgeMatch(g, sourceId, targetId);
            })
            .on("mouseleave", function() {
                const searchInput = document.getElementById("search");
                const searchValue = searchInput.value.trim();
                if (searchValue === '' && highlightState.mode !== 'node_click') {
                    resetHighlight(g);
                } else if (searchValue !== '') {
                    reapplySearch(g, searchInput);
                }
            });

            hoverOverlay.on("click", function(event) {
                event.stopPropagation();
                const sourceId = this.getAttribute("data-source");
                const targetId = this.getAttribute("data-target");
                const edgeData = edges.find(e => e.source === sourceId && e.target === targetId);
                if (edgeData) {
                    showReductionInfo(edgeData, nodes, references);
                }
            });

            const hasLabel = edge.label && edge.label.trim() !== '';
            const hasRefs = edge.references && edge.references.length > 0;
            
            if (hasLabel || hasRefs) {
                const labelGroup = g.append("g")
                    .attr("class", "edge-label-group")
                    .attr("data-edge-id", edge.id)
                    .attr("data-source", edge.source)
                    .attr("data-target", edge.target)
                    .style("cursor", "pointer")
                    .style("pointer-events", "all")
                    .style("transition", "opacity 0.2s ease");

                let labelHTML = '';
                
                if (hasLabel) {
                    labelHTML += `<div style="font-size: 13px; font-weight: bold; color: #000000; text-align: center; line-height: 1.3;">${edge.label}</div>`;
                }
                
                if (hasRefs) {
                    const refLinks = edge.references.map((r) => {
                        const ref = references.find(x => x.id === r);
                        if (ref) {
                            return `<a href="${ref.url}" target="_blank" style="color: #000000; text-decoration: none; border-bottom: 1px dotted #000000; font-size: 11px; cursor: pointer; padding: 0 2px;">${ref.short}</a>`;
                        }
                        return `<span style="font-size: 11px; color: #000000;">${r}</span>`;
                    });
                    
                    const refsHTML = refLinks.reduce((acc, link, index) => {
                        if (index === 0) return link;
                        return `${acc}, ${link}`;
                    }, '');
                    
                    labelHTML += `<div style="font-size: 11px; color: #000000; text-align: center; margin-top: ${hasLabel ? '1px' : '0'}; line-height: 1.3;">${refsHTML}</div>`;
                }

                let estimatedWidth = 60;
                if (hasLabel) {
                    const cleanLabel = edge.label.replace(/\$[^$]*\$/g, 'M').replace(/\\[a-zA-Z]+/g, 'M');
                    estimatedWidth += cleanLabel.length * 7;
                }
                if (hasRefs) {
                    const refText = edge.references.join(', ');
                    estimatedWidth += refText.length * 5;
                }
                const textWidth = Math.max(estimatedWidth + 30, 80);
                const textHeight = (hasLabel && hasRefs) ? 48 : 32;

                const labelOffset = isUpward ? -18 : 18;
                const labelX = midX;
                const labelY = midY + labelOffset;

                const bgRect = labelGroup.append("rect")
                    .attr("x", labelX - textWidth/2)
                    .attr("y", labelY - textHeight/2)
                    .attr("width", textWidth)
                    .attr("height", textHeight)
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("fill", "white")
                    .attr("stroke", "#ddd")
                    .attr("stroke-width", 1)
                    .style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.08))")
                    .style("pointer-events", "none")
                    .style("transition", "all 0.2s ease");

                const labelContainer = labelGroup.append("foreignObject")
                    .attr("x", labelX - textWidth/2 + 6)
                    .attr("y", labelY - textHeight/2 + 3)
                    .attr("width", textWidth - 12)
                    .attr("height", textHeight - 6)
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

                labelGroup.on("click", function(event) {
                    event.stopPropagation();
                    const sourceId = this.getAttribute("data-source");
                    const targetId = this.getAttribute("data-target");
                    const edgeData = edges.find(e => e.source === sourceId && e.target === targetId);
                    if (edgeData) {
                        showReductionInfo(edgeData, nodes, references);
                    }
                });

                labelGroup.on("mouseenter", function() {
                    const sourceId = this.getAttribute("data-source");
                    const targetId = this.getAttribute("data-target");
                    highlightEdgeMatch(g, sourceId, targetId);
                    
                    bgRect.style("filter", "drop-shadow(0 2px 6px rgba(0,0,0,0.2))");
                    bgRect.style("stroke", "#000");
                    bgRect.style("stroke-width", 1.5);
                })
                .on("mouseleave", function() {
                    const searchInput = document.getElementById("search");
                    const searchValue = searchInput.value.trim();
                    if (searchValue === '' && highlightState.mode !== 'node_click') {
                        resetHighlight(g);
                    } else if (searchValue !== '') {
                        reapplySearch(g, searchInput);
                    }
                    
                    bgRect.style("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.08))");
                    bgRect.style("stroke", "#ddd");
                    bgRect.style("stroke-width", 1);
                });

                if (hasRefs) {
                    labelDiv.selectAll("a")
                        .style("pointer-events", "auto")
                        .on("click", function(event) {
                            event.stopPropagation();
                        });
                }

                if (edge.label && edge.label.includes('$')) {
                    setTimeout(() => {
                        renderMathJax();
                    }, 100);
                }
            }
        });

        rebuildConditionsMenu(edges);

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
            const matchSet = new Set([nodeId]);
            highlightNodeMatches(g, matchSet);
        })
        .on("mouseleave", function() {
            const searchInput = document.getElementById("search");
            const searchValue = searchInput.value.trim();
            if (searchValue === '' && highlightState.mode !== 'node_click') {
                resetHighlight(g);
            } else if (searchValue !== '') {
                reapplySearch(g, searchInput);
            } else if (highlightState.mode === 'node_click') {
                highlightNodeClick(g, highlightState.nodeId, edges);
            }
        });

        node.on("click", function(event) {
            event.stopPropagation();
            const nodeId = this.getAttribute("data-id");
            const nodeData = d3.select(this).data()[0];
            
            console.log("Node clicked:", nodeId);
            
            highlightNodeClick(g, nodeId, edges);
            
            const displayName = nodeData.data.fullname || nodeData.data.name || nodeData.data.id;
            
            let html = `
                <h2>${displayName}</h2>
                <p><b>Description:</b> ${nodeData.data.description || "No description"}</p>
                <p><b>Family:</b> ${nodeData.data.family || "Unspecified"}</p>
                <p><b>Keywords:</b> ${nodeData.keywords.length > 0 ? nodeData.keywords.join(", ") : "none"}</p>
                <h3>References</h3>
                <ul>
            `;
            
            if (nodeData.data.references && nodeData.data.references.length > 0) {
                nodeData.data.references.forEach(r => {
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

        svg.on("click", function() {
            if (highlightState.mode === 'node_click') {
                resetHighlight(g);
                const searchInput = document.getElementById("search");
                if (searchInput.value.trim() !== '') {
                    reapplySearch(g, searchInput);
                }
            }
        });

        const search = document.getElementById("search");
        search.addEventListener("input", () => {
            if (highlightState.mode === 'node_click') {
                resetHighlight(g);
            }
            
            const q = search.value.trim();
            
            if (q === '') {
                resetHighlight(g);
                return;
            }
            
            const keywords = q.split(',').map(k => k.trim()).filter(k => k !== '');
            
            const matchingIds = new Set();
            g.selectAll(".node").each(function() {
                const d = d3.select(this).data()[0];
                if (d && nodeMatchesSearch(d, keywords)) {
                    matchingIds.add(d.id);
                }
            });
            
            highlightSearchMatches(g, matchingIds);
        });

        // Apply conditions on load
        setTimeout(() => {
            updateConditions();
        }, 200);

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
