import {
    Grid, Message, Icon, Button,
} from 'semantic-ui-react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';

import { setStoryGroup, setStoryMode } from '../../store/actions/actions';
import { wrapMeteorCallback } from '../utils/Errors';

import IntroStorySubMenu from './IntroStorySubMenu';
import ItemsBrowser from '../common/Browser';
import StoriesEditor from './StoriesEditor';
import { can } from '../../../lib/scopes';

class Stories extends React.Component {
    constructor(props) {
        super(props);
        const { storyGroupCurrent } = this.props;
        this.state = {
            // storyIndex is used to track the index of element in the browser component
            // storyGroupNameSelected used to track the storygroup to be displayed by the storyEditor
            storyIndex: storyGroupCurrent,
            saving: false,
            validationErrors: false,
            storyGroupNameSelected: '',
        };
    }

    handleAddStoryGroup = async (name) => {
        const { projectId } = this.props;
        Meteor.call(
            'storyGroups.insert',
            {
                name,
                projectId,
            },
            wrapMeteorCallback((err, groupId) => {
                if (!err) {
                    Meteor.call(
                        'stories.insert',
                        {
                            story: '',
                            title: name,
                            storyGroupId: groupId,
                            projectId,
                        },
                        wrapMeteorCallback((error) => {
                            if (!error) {
                                this.setState({
                                    validationErrors: false,
                                    storyGroupNameSelected: name,
                                });
                            }
                        }),
                    );
                }
            }),
        );
    };

    handleMenuChange = (index) => {
        const { changeStoryGroup } = this.props;
        this.setState({
            storyIndex: index,
            validationErrors: false,
            storyGroupNameSelected: '',
        });
        changeStoryGroup(index);
    };

    handleSavingStories = () => {
        this.setState({ saving: true });
    };

    handleSavedStories = () => {
        this.setState({ saving: false });
    };

    handleError = () => {
        this.setState({ validationErrors: true });
    };

    handleErrorResolved = () => {
        this.setState({ validationErrors: false });
    };

    handleNewStory = (introStoryGroup, indexOfNewStory) => {
        const { projectId, storyGroups } = this.props;
        const { storyIndex } = this.state;
        Meteor.call(
            'stories.insert',
            {
                story: '',
                title: `${
                    !!introStoryGroup
                        ? introStoryGroup.name
                        : storyGroups[storyIndex].name
                } ${indexOfNewStory}`,
                projectId,
                storyGroupId: `${
                    !!introStoryGroup ? introStoryGroup._id : storyGroups[storyIndex]._id
                }`,
            },
            wrapMeteorCallback(),
        );
    };

    handleDeleteGroup = (index, filterdStoryGroup) => {
        if (index !== -1) {
            Meteor.call(
                'storyGroups.delete',
                filterdStoryGroup[index],
                wrapMeteorCallback((err) => {
                    if (!err) {
                        this.setState({
                            storyIndex: -1,
                            storyGroupNameSelected: '',
                        });
                    }
                }),
            );
        }
    };

    handleStoryGroupSelect = (storyGroup) => {
        // eslint-disable-next-line no-param-reassign
        storyGroup.selected = !storyGroup.selected;
        Meteor.call('storyGroups.update', storyGroup, wrapMeteorCallback());
    };

    handleNameChange = (storyGroup) => {
        Meteor.call(
            'storyGroups.update',
            storyGroup,
            wrapMeteorCallback((err) => {
                if (!err) {
                    this.setState({ storyGroupNameSelected: storyGroup.name });
                }
            }),
        );
    };

    handleIntroStoryClick = (event) => {
        event.preventDefault();
        const { changeStoryGroup } = this.props;
        this.setState({ storyIndex: -1, storyGroupNameSelected: '' });
        changeStoryGroup(-1);
    };

    sortAlphabetically = (a, b) => a.name.localeCompare(b.name);

    handleIntroClick = (e, introStory) => {
        e.stopPropagation();
        this.handleStoryGroupSelect(introStory);
    };

    storyGroupSelected = (storyIndex, storyGroupNameSelected, storyGroupFiltered) => {
        const { changeStoryGroup } = this.props;
        if (
            storyGroupNameSelected === ''
            || (storyGroupFiltered[storyIndex] && storyGroupFiltered[storyIndex].name)
                === storyGroupNameSelected
        ) {
            return storyIndex;
        }
        const newIndex = storyGroupFiltered.findIndex(
            storyGroup => storyGroup.name === storyGroupNameSelected,
        );
        changeStoryGroup(newIndex);
        return newIndex;
    };

    renderStoryEditor = (storyGroupFiltered, introStory, storySelected) => {
        const { projectId, storyGroups, storyMode } = this.props;
        const storyGroupSelected = storyGroupFiltered[storySelected];

        return (
            (storyGroupSelected || introStory) && (
                <StoriesEditor
                    editor={storyMode}
                    disabled={!can('stories:w', projectId)}
                    storyGroup={storyGroupSelected || introStory}
                    onSaving={this.handleSavingStories}
                    onSaved={this.handleSavedStories}
                    onError={this.handleError}
                    onErrorResolved={this.handleErrorResolved}
                    onAddNewStory={index => this.handleNewStory(storyGroupSelected || introStory, index)
                    }
                    projectId={projectId}
                    onDeleteGroup={() => this.handleDeleteGroup(storySelected, storyGroupFiltered)
                    }
                    groupNames={storyGroups.map(group => ({
                        text: group.name,
                        value: group._id,
                    }))}
                />
            )
        );
    };

    removeAllSelection = () => {
        const { projectId } = this.props;
        Meteor.call('storyGroups.removeFocus', projectId);
    };

    renderMessages = () => {
        const { storyGroups } = this.props;
        const numberOfSelectedStoryGroups = storyGroups.filter(
            storyGroup => storyGroup.selected,
        ).length;
        /* eslint-disable jsx-a11y/click-events-have-key-events */
        const link = (
            <span
                id='remove-focus'
                tabIndex='0'
                onClick={this.removeAllSelection}
                role='button'
            >
                Remove focus
            </span>
        );
        const plural = numberOfSelectedStoryGroups > 1;
        return (
            numberOfSelectedStoryGroups >= 1 && (
                <Message warning>
                    You’re currently focusing on {numberOfSelectedStoryGroups} story group
                    {plural && 's'} and only {plural ? 'those' : 'that'} story group
                    {plural && 's'} will be trained. {link}
                </Message>
            )
        );
    };
    
    render() {
        const {
            storyGroups, projectId, changeStoryMode, storyMode,
        } = this.props;
        const {
            storyIndex,
            saving,
            validationErrors,
            storyGroupNameSelected,
        } = this.state;
        const introStory = storyGroups.find(storyGroup => storyGroup.introStory);
        const storyGroupFiltered = storyGroups
            .filter(storyGroup => !storyGroup.introStory)
            .sort(this.sortAlphabetically);
        const storySelected = this.storyGroupSelected(
            storyIndex,
            storyGroupNameSelected,
            storyGroupFiltered,
        );
        const canAddStory = can('stories:w', projectId);

        return (
            <Grid className='stories-container'>
                <Grid.Row columns={2}>
                    <Grid.Column width={4}>
                        {validationErrors && (
                            <Message
                                negative
                                content="Your changes haven't been saved. Please correct errors first."
                            />
                        )}
                        {this.renderMessages()}
                        {storyGroupFiltered && (
                            <ItemsBrowser
                                data={storyGroupFiltered}
                                allowAddition={canAddStory}
                                allowEdit={canAddStory}
                                index={storySelected}
                                onAdd={this.handleAddStoryGroup}
                                onChange={this.handleMenuChange}
                                nameAccessor='name'
                                saving={saving}
                                selectAccessor='selected'
                                toggleSelect={this.handleStoryGroupSelect}
                                changeName={this.handleNameChange}
                                placeholderAddItem='Choose a group name'
                            >
                                <IntroStorySubMenu
                                    introStory={introStory}
                                    introClick={this.handleIntroClick}
                                    introStoryClick={this.handleIntroStoryClick}
                                    isSelected={storySelected === -1}
                                />
                            </ItemsBrowser>
                        )}
                    </Grid.Column>

                    <Grid.Column width={12}>
                        <Grid.Row>
                            <Grid.Column width={12} className='story-name-parent'>
                                <div className='stories-toggles'>
                                    {storySelected !== -1 ? (
                                        <Message info size='small'>
                                            Create detailed use case scenarios for your bot using
                                            multiple stories.
                                        </Message>
                                    ) : (
                                        <Message info size='small'>
                                            The Intro stories group contains the initial messages
                                            that would be sent to users when they start chatting
                                            with your bot.
                                        </Message>
                                    )}
                                    <Button.Group>
                                        <Button
                                            className={
                                                storyMode === 'markdown'
                                                    ? ''
                                                    : 'not-selected-editor'
                                            }
                                            data-cy='toggle-md'
                                            icon
                                            basic
                                            onClick={() => {
                                                changeStoryMode('markdown');
                                            }}
                                        >
                                            <Icon name='code' />
                                        </Button>
                                        <Button
                                            className={
                                                storyMode === 'visual'
                                                    ? ''
                                                    : 'not-selected-editor'
                                            }
                                            icon
                                            data-cy='toggle-visual'
                                            basic
                                            onClick={() => {
                                                changeStoryMode('visual');
                                            }}
                                        >
                                            <Icon name='commenting' />
                                        </Button>
                                    </Button.Group>
                                </div>
                            </Grid.Column>
                        </Grid.Row>
                        {this.renderStoryEditor(
                            storyGroupFiltered,
                            introStory,
                            storySelected,
                        )}
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        );
    }
}

Stories.propTypes = {
    projectId: PropTypes.string.isRequired,
    storyGroups: PropTypes.array.isRequired,
    storyGroupCurrent: PropTypes.number,
    storyMode: PropTypes.string.isRequired,
    changeStoryGroup: PropTypes.func.isRequired,
    changeStoryMode: PropTypes.func.isRequired,
};

Stories.defaultProps = {
    storyGroupCurrent: -1,
};

const mapStateToProps = state => ({
    storyMode: state.get('storyMode'),
    storyGroupCurrent: state.get('storyGroupCurrent'),
});

const mapDispatchToProps = {
    changeStoryGroup: setStoryGroup,
    changeStoryMode: setStoryMode,
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(Stories);
