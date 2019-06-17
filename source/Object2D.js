"use strict";

import {Vector2} from "./math/Vector2.js";
import {Matrix} from "./math/Matrix.js";
import {UUID} from "./math/UUID.js";

/**
 * Base object class, implements all the object positioning and scalling features.
 *
 * Stores all the base properties shared between all objects as the position, transformation properties, children etc.
 *
 * Object2D should be used as a group to store all the other objects drawn.
 *
 * @class
 */
function Object2D()
{	
	/**
	 * UUID of the object.
	 */
	this.uuid = UUID.generate(); 

	/**
	 * List of children objects attached to the object.
	 */
	this.children = [];

	/**
	 * Parent object, the object position is affected by its parent position.
	 */
	this.parent = null;

	/**
	 * Depth level in the object tree, objects with higher depth are drawn on top.
	 *
	 * The layer value is considered first. 
	 */
	this.level = 0;

	/**
	 * Position of the object.
	 */
	this.position = new Vector2(0, 0);

	/**
	 * Origin of the object used as point of rotation.
	 */
	this.origin = new Vector2(0, 0);

	/**
	 * Scale of the object.
	 */
	this.scale = new Vector2(1, 1);

	/**
	 * Rotation of the object relative to its center.
	 */
	this.rotation = 0.0;

	/**
	 * Indicates if the object is visible.
	 */
	this.visible = true;

	/**
	 * Layer of this object, objects are sorted by layer value.
	 *
	 * Lower layer value is draw first.
	 */
	this.layer = 0;

	/**
	 * Local transformation matrix applied to the object. 
	 */
	this.matrix = new Matrix();

	/**
	 * Global transformation matrix multiplied by the parent matrix.
	 *
	 * Used to transform the object before projecting into screen coordinates.
	 */
	this.globalMatrix = new Matrix();

	/**
	 * Inverse of the global matrix.
	 *
	 * Used to convert pointer input points into object coordinates.
	 */
	this.inverseGlobalMatrix = new Matrix();

	/**
	 * Masks being applied to this object.
	 *
	 * Multiple masks can be used simultaneously.
	 */
	this.masks = [];

	/**
	 * If true the matrix is updated before rendering the object.
	 */
	this.matrixNeedsUpdate = true;

	/**
	 * Indicates if its possible to drag the object around.
	 *
	 * If true the onPointerDrag callback is used to update the state of the object.
	 */
	this.draggable = false;

	/**
	 * Indicates if this object uses pointer events.
	 *
	 * Can be set false to skip the pointer interaction events.
	 */
	this.pointerEvents = true;

	/**
	 * Flag to indicate wheter this objet ignores the viewport transformation.
	 */
	this.ignoreViewport = false;

	/**
	 * Flag to indicate if the context of canvas should be saved before render.
	 */
	this.saveContextState = true;

	/**
	 * Flag to indicate if the context of canvas should be restored after render.
	 */
	this.restoreContextState = true;

	/**
	 * Flag indicating if the pointer is inside of the element.
	 *
	 * Used to control object event.
	 */
	this.pointerInside = false;

	/**
	 * Flag to indicate if the object is currently being dragged.
	 */
	this.beingDragged = false;
}

/**
 * Traverse the object tree and run a function for all objects.
 *
 * @param {Function} callback Callback function that receives the object as parameter.
 */
Object2D.prototype.traverse = function(callback)
{
	callback(this);

	var children = this.children;

	for(var i = 0; i < children.length; i++)
	{
		children[i].traverse(callback);
	}
};

/**
 * Get a object from its children list by its UUID.
 *
 * @param {String} uuid UUID of the object to get.
 * @return {Object2D} The object that has the UUID specified, null if the object was not found.
 */
Object2D.prototype.getChildByUUID = function(uuid)
{
	var object = null;

	this.traverse(function(child)
	{
		if(child.uuid === uuid)
		{
			object = child;
		}
	});

	return object;
};

/**
 * Attach a children to this object.
 *
 * The object is set as children of this object and the transformations applied to this object are traversed to its children.
 *
 * @param {Object2D} object Object to attach to this object.
 */ 
Object2D.prototype.add = function(object)
{
	object.parent = this;
	object.level = this.level + 1;

	object.traverse(function(child)
	{
		if(child.onAdd !== null)
		{
			child.onAdd(this);
		}
	});

	this.children.push(object);
};

/**
 * Remove object from the children list.
 *
 * @param {Object2D} object Object to be removed.
 */
Object2D.prototype.remove = function(object)
{
	var index = this.children.indexOf(object);
	
	if(index !== -1)
	{
		var object = this.children[index];
		object.parent = null;
		object.level = 0;

		object.traverse(function(child)
		{
			if(child.onRemove !== null)
			{
				child.onRemove(this);
			}
		});

		this.children.splice(index, 1)
	}
};

/**
 * Check if a point is inside of the object.
 *
 * Used to update the point events attached to the object.
 *
 * @return {boolean} True if the point is inside of the object.
 */
Object2D.prototype.isInside = function(point)
{
	return false;
};

/**
 * Update the transformation matrix of the object.
 *
 * @param {CanvasContext} context
 */
Object2D.prototype.updateMatrix = function(context)
{
	if(this.matrixNeedsUpdate)
	{
		this.matrix.compose(this.position.x, this.position.y, this.scale.x, this.scale.y, this.origin.x, this.origin.y, this.rotation);
		this.globalMatrix.copy(this.matrix);

		if(this.parent !== null)
		{	
			this.globalMatrix.premultiply(this.parent.globalMatrix);
		}

		this.inverseGlobalMatrix = this.globalMatrix.getInverse()
		//this.matrixNeedsUpdate = false;
	}
};

/**
 * Apply the transform to the rendering context.
 *
 * It is assumed that the viewport transform is pre-applied to the context.
 *
 * Can also be used for pre rendering logic.
 *
 * @param {CanvasContext} context Canvas 2d drawing context.
 * @param {Viewport} viewport Viewport applied to the canvas.
 */
Object2D.prototype.transform = function(context, viewport)
{
	this.globalMatrix.tranformContext(context);
};

/**
 * Draw the object into the canvas.
 *
 * Has to be implemented by underlying classes.
 *
 * @param {CanvasContext} context Canvas 2d drawing context.
 * @param {Viewport} viewport Viewport applied to the canvas.
 * @param {DOM} canvas DOM canvas element where the content is being drawn.
 */
Object2D.prototype.draw = function(context, viewport, canvas){};

/**
 * Callback method while the object is being dragged across the screen.
 *
 * By default is adds the delta value to the object position (making it follow the mouse movement).
 *
 * Delta is the movement of the pointer already translated into local object coordinates.
 *
 * Receives (pointer, viewport, delta) as arguments.
 *
 * @param {Pointer} pointer Pointer object that receives the user input.
 * @param {Viewport} viewport Viewport where the object is drawn.
 * @param {Vector2} delta Pointer movement in world space.
 */
Object2D.prototype.onPointerDrag = function(pointer, viewport, delta)
{
	this.position.add(delta);
};

/**
 * Method called when the object its added to a parent.
 *
 * @param {Object2D} parent Parent object were it was added.
 */
Object2D.prototype.onAdd = null;

/**
 * Method called when the object gets removed from its parent
 *
 * @param {Object2D} parent Parent object from were the object is being removed.
 */
Object2D.prototype.onRemove = null;

/**
 * Callback method called every time before the object is draw into the canvas.
 *
 * Can be used to run preparation code, move the object, etc.
 */
Object2D.prototype.onUpdate = null;

/**
 * Callback method called when the pointer enters the object.
 *
 * Receives (pointer, viewport) as arguments.
 *
 * @param {Pointer} pointer Pointer object that receives the user input.
 * @param {Viewport} viewport Viewport where the object is drawn.
 */
Object2D.prototype.onPointerEnter = null;

/**
 * Callback method called when the was inside of the object and leaves the object.
 *
 * Receives (pointer, viewport) as arguments.
 *
 * @param {Pointer} pointer Pointer object that receives the user input.
 * @param {Viewport} viewport Viewport where the object is drawn.
 */
Object2D.prototype.onPointerLeave = null;

/**
 * Callback method while the pointer is over (inside) of the object.
 *
 * Receives (pointer, viewport) as arguments.
 *
 * @param {Pointer} pointer Pointer object that receives the user input.
 * @param {Viewport} viewport Viewport where the object is drawn.
 */
Object2D.prototype.onPointerOver = null;

/**
 * Callback method called while the pointer button is pressed.
 *
 * Receives (pointer, viewport) as arguments.
 *
 * @param {Pointer} pointer Pointer object that receives the user input.
 * @param {Viewport} viewport Viewport where the object is drawn.
 */
Object2D.prototype.onButtonPressed = null;

/**
 * Callback method called while the pointer button is double clicked.
 *
 * Receives (pointer, viewport) as arguments.
 *
 * @param {Pointer} pointer Pointer object that receives the user input.
 * @param {Viewport} viewport Viewport where the object is drawn.
 */
Object2D.prototype.onDoubleClick = null;

/**
 * Callback method called when the pointer button is pressed down (single time).
 *
 * Receives (pointer, viewport) as arguments.
 *
 * @param {Pointer} pointer Pointer object that receives the user input.
 * @param {Viewport} viewport Viewport where the object is drawn.
 */
Object2D.prototype.onButtonDown = null;

/**
 * Callback method called when the pointer button is released (single time).
 *
 * Receives (pointer, viewport) as arguments.
 *
 * @param {Pointer} pointer Pointer object that receives the user input.
 * @param {Viewport} viewport Viewport where the object is drawn.
 */
Object2D.prototype.onButtonUp = null;

export {Object2D};
